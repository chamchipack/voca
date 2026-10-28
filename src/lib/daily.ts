import { db, getSettings } from '../db'
import type { DailySession, Deck, DeckKind, Progress } from '../types'
import { DEFAULT_EASE, schedule, tomorrowStart } from './srs'

export function todayKey(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const newDeck = (ids: number[]): Deck => ({ wordIds: ids, queue: [...ids], doneIds: [], wrongIds: [] })

export const deckOf = (s: DailySession, kind: DeckKind): Deck | undefined => (kind === 'new' ? s : s.review)

const touched = (d: Deck | undefined) => !!d && (d.doneIds.length > 0 || d.wrongIds.length > 0)

/** 묶음을 바꾼 세션. 새 단어 묶음은 최상위 필드라서 펼쳐 넣는다 */
const withDeck = (s: DailySession, kind: DeckKind, d: Deck): DailySession =>
  kind === 'new' ? { ...s, ...d } : { ...s, review: d }

/**
 * 아직 학습 기록이 없는 단어 중 count개를 고른다.
 * 지난번에 배정만 되고 손대지 못한 단어가 있으면 그것부터 채운다.
 */
async function pickNewWords(date: string, count: number, exclude: Set<number>) {
  const { pickMode } = await getSettings()
  const studied = new Set((await db.progress.toCollection().primaryKeys()) as number[])
  const candidates = ((await db.words.orderBy('order').primaryKeys()) as number[]).filter(
    (id) => !studied.has(id) && !exclude.has(id),
  )
  const candidateSet = new Set(candidates)

  const prev = await db.daily.where('date').below(date).last()
  const leftover = (prev?.queue ?? []).filter((id) => candidateSet.has(id))
  const leftoverSet = new Set(leftover)
  const rest = candidates.filter((id) => !leftoverSet.has(id))

  return [...leftover, ...(pickMode === 'random' ? shuffle(rest) : rest)].slice(0, count)
}

/** 오늘까지 복습일이 된 단어. 오늘 새로 배정된 단어는 뺀다 */
export async function dueWordIds(excludeIds: number[] = []) {
  const exclude = new Set(excludeIds)
  const due = await db.progress.where('nextReviewAt').below(tomorrowStart()).toArray()
  return due.filter((p) => !exclude.has(p.wordId)).map((p) => p.wordId)
}

/** 오늘 배정(새 단어 + 복습)을 가져오고, 없으면 새로 만든다 */
export async function ensureToday(date = todayKey()): Promise<DailySession> {
  return db.transaction('rw', db.words, db.progress, db.daily, db.settings, async () => {
    const existing = await db.daily.get(date)
    if (existing?.review) return existing
    let s = existing
    if (!s) {
      const { dailyNewCount } = await getSettings()
      s = { date, ...newDeck(await pickNewWords(date, dailyNewCount, new Set())) }
    }
    s = { ...s, review: newDeck(shuffle(await dueWordIds(s.wordIds))) }
    await db.daily.put(s)
    return s
  })
}

/**
 * 설정이 바뀌었을 때, 오늘 새 단어를 아직 한 장도 채점하지 않았으면 새 설정으로 다시 뽑는다.
 * 복습 묶음은 그대로 둔다. 다시 뽑았으면 true
 */
export async function resetTodayIfUntouched(date = todayKey()) {
  return db.transaction('rw', db.words, db.progress, db.daily, db.settings, async () => {
    const s = await db.daily.get(date)
    if (!s) return true
    if (touched(s)) return false
    if (!touched(s.review)) {
      // 복습도 손대지 않았으면 통째로 지워 학습 화면을 열 때 새로 만든다
      await db.daily.delete(date)
      return true
    }
    const { dailyNewCount } = await getSettings()
    await db.daily.put({ ...s, ...newDeck(await pickNewWords(date, dailyNewCount, new Set())) })
    return true
  })
}

/** 오늘 할당을 다 끝낸 뒤 새 단어를 하루치만큼 더 받는다. 추가된 개수를 돌려준다 */
export async function addMoreToday(date = todayKey()) {
  return db.transaction('rw', db.words, db.progress, db.daily, db.settings, async () => {
    const s = await db.daily.get(date)
    if (!s) return 0
    const { dailyNewCount } = await getSettings()
    const ids = await pickNewWords(date, dailyNewCount, new Set(s.wordIds))
    await db.daily.update(date, { wordIds: [...s.wordIds, ...ids], queue: [...s.queue, ...ids] })
    return ids.length
  })
}

/** 남은 새 단어(학습 기록이 없고 오늘 배정되지 않은 단어)가 있는지 */
export async function hasMoreNewWords(session: DailySession) {
  const studied = new Set((await db.progress.toCollection().primaryKeys()) as number[])
  const assigned = new Set(session.wordIds)
  const ids = (await db.words.toCollection().primaryKeys()) as number[]
  return ids.some((id) => !studied.has(id) && !assigned.has(id))
}

/**
 * 카드 채점. 새 단어와 복습이 같은 규칙을 쓴다.
 * - 그날 처음 채점한 결과로 다음 복습일을 정한다(srs.schedule)
 * - 알아요: 오늘 카드 끝
 * - 모르겠어요: 남은 카드 맨 뒤로 보내 오늘 안에 다시 나오게 한다. 다시 맞혀도 복습일은 바뀌지 않는다
 */
export async function answer(date: string, kind: DeckKind, wordId: number, known: boolean) {
  await db.transaction('rw', db.progress, db.daily, async () => {
    const s = await db.daily.get(date)
    const d = s && deckOf(s, kind)
    if (!s || !d) return
    const now = Date.now()
    let p: Progress = (await db.progress.get(wordId)) ?? {
      wordId,
      status: 'new',
      correctCount: 0,
      wrongCount: 0,
      interval: 0,
      ease: DEFAULT_EASE,
      reps: 0,
    }
    const firstToday = !d.wrongIds.includes(wordId) && !d.doneIds.includes(wordId)
    if (firstToday) p = schedule(p, known, now)
    p.firstStudiedAt ??= now
    p.lastStudiedAt = now

    const queue = d.queue.filter((id) => id !== wordId)
    if (known) {
      p.correctCount++
      await db.daily.put(withDeck(s, kind, { ...d, queue, doneIds: [...d.doneIds, wordId] }))
    } else {
      p.wrongCount++
      await db.daily.put(
        withDeck(s, kind, {
          ...d,
          queue: [...queue, wordId],
          wrongIds: d.wrongIds.includes(wordId) ? d.wrongIds : [...d.wrongIds, wordId],
        }),
      )
    }
    await db.progress.put(p)
  })
}

/** 배정 후 삭제된 단어를 오늘 배정(새 단어, 복습 모두)에서 뺀다 */
export async function dropFromToday(date: string, wordId: number) {
  await db.transaction('rw', db.daily, async () => {
    const s = await db.daily.get(date)
    if (!s) return
    const without = (ids: number[]) => ids.filter((id) => id !== wordId)
    const strip = (d: Deck): Deck => ({
      wordIds: without(d.wordIds),
      queue: without(d.queue),
      doneIds: without(d.doneIds),
      wrongIds: without(d.wrongIds),
    })
    await db.daily.put({ ...s, ...strip(s), ...(s.review && { review: strip(s.review) }) })
  })
}
