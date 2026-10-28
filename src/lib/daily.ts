import { db, getSettings } from '../db'
import type { DailySession, Progress } from '../types'

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

/** 오늘 배정을 가져오고, 없으면 새로 만든다 */
export async function ensureToday(date = todayKey()): Promise<DailySession> {
  return db.transaction('rw', db.words, db.progress, db.daily, db.settings, async () => {
    const existing = await db.daily.get(date)
    if (existing) return existing
    const { dailyNewCount } = await getSettings()
    const ids = await pickNewWords(date, dailyNewCount, new Set())
    const session: DailySession = { date, wordIds: ids, queue: [...ids], doneIds: [], wrongIds: [] }
    await db.daily.put(session)
    return session
  })
}

/**
 * 설정이 바뀌었을 때, 오늘 아직 한 장도 채점하지 않았으면 오늘 배정을 지워
 * 다음에 학습 화면을 열 때 새 설정으로 다시 뽑히게 한다. 지웠으면 true
 */
export async function resetTodayIfUntouched(date = todayKey()) {
  return db.transaction('rw', db.daily, async () => {
    const s = await db.daily.get(date)
    if (!s) return true
    if (s.doneIds.length > 0 || s.wrongIds.length > 0) return false
    await db.daily.delete(date)
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
 * 카드 채점.
 * - 알아요: 오늘 카드 끝. 오늘 한 번도 틀리지 않았으면 '외움', 틀린 적 있으면 '학습 중'
 * - 모르겠어요: '학습 중'으로 두고 남은 카드 맨 뒤로 보내 다시 나오게 한다
 */
export async function answer(date: string, wordId: number, known: boolean) {
  await db.transaction('rw', db.progress, db.daily, async () => {
    const s = await db.daily.get(date)
    if (!s) return
    const now = Date.now()
    const prev = await db.progress.get(wordId)
    const p: Progress = prev ?? { wordId, status: 'new', correctCount: 0, wrongCount: 0 }
    p.firstStudiedAt ??= now
    p.lastStudiedAt = now

    const queue = s.queue.filter((id) => id !== wordId)
    if (known) {
      p.correctCount++
      p.status = s.wrongIds.includes(wordId) ? 'learning' : 'known'
      await db.daily.update(date, { queue, doneIds: [...s.doneIds, wordId] })
    } else {
      p.wrongCount++
      p.status = 'learning'
      await db.daily.update(date, {
        queue: [...queue, wordId],
        wrongIds: s.wrongIds.includes(wordId) ? s.wrongIds : [...s.wrongIds, wordId],
      })
    }
    await db.progress.put(p)
  })
}

/** 배정 후 삭제된 단어를 오늘 배정에서 뺀다 */
export async function dropFromToday(date: string, wordId: number) {
  await db.transaction('rw', db.daily, async () => {
    const s = await db.daily.get(date)
    if (!s) return
    const without = (ids: number[]) => ids.filter((id) => id !== wordId)
    await db.daily.update(date, {
      wordIds: without(s.wordIds),
      queue: without(s.queue),
      doneIds: without(s.doneIds),
      wrongIds: without(s.wrongIds),
    })
  })
}
