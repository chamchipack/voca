import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { addMoreToday, answer, deckOf, dropFromToday, ensureToday, hasMoreNewWords, todayKey } from '../lib/daily'
import { reviewLabel, tomorrowStart } from '../lib/srs'
import type { DailySession, DeckKind, Word } from '../types'
import styles from './Study.module.css'

const KIND_LABEL: Record<DeckKind, string> = { review: '복습', new: '새 단어' }

export default function Study() {
  const date = todayKey()
  const [ready, setReady] = useState(false)
  // 같은 카드가 연속으로 나와도(남은 카드가 1장일 때) 새 카드로 다시 그리기 위한 카운터
  const [answered, setAnswered] = useState(0)
  // 사용자가 탭을 고르기 전에는 복습이 남아 있으면 복습부터 보여준다
  const [chosen, setChosen] = useState<DeckKind | null>(null)

  // 오늘 배정이 없으면 만든다. 이후 화면은 DB를 구독해서 갱신된다
  useEffect(() => {
    ensureToday(date).then(() => setReady(true))
  }, [date])

  const session = useLiveQuery(() => db.daily.get(date), [date])
  const wordCount = useLiveQuery(() => db.words.count())
  const kind: DeckKind = chosen ?? (session?.review?.queue.length ? 'review' : 'new')
  const deck = session && deckOf(session, kind)
  const currentId = deck?.queue[0]
  const current = useLiveQuery(
    async () => (currentId == null ? null : ((await db.words.get(currentId)) ?? 'missing')),
    [currentId],
  )

  // 배정 후 삭제된 단어는 건너뛴다
  useEffect(() => {
    if (current === 'missing' && currentId != null) dropFromToday(date, currentId)
  }, [current, currentId, date])

  if (!ready || !session || !deck || wordCount === undefined) return null

  const shell = (children?: ReactNode) => (
    <Shell session={session} kind={kind} onKind={setChosen}>
      {children}
    </Shell>
  )

  if (wordCount === 0) {
    return shell(
      <div className={styles.doneCard}>
        <span className={styles.doneGlyph}>空</span>
        <span className={styles.doneTitle}>아직 단어가 없어요</span>
        <Link className={styles.primary} to="/settings/import">CSV 가져오기</Link>
      </div>,
    )
  }

  if (deck.queue.length === 0) {
    return shell(
      kind === 'new' ? (
        <NewDone session={session} onReview={() => setChosen('review')} />
      ) : (
        <ReviewDone session={session} onNew={() => setChosen('new')} />
      ),
    )
  }

  if (!current || current === 'missing') return shell()

  return shell(
    <Flashcard
      key={`${kind}-${current.id}-${answered}`}
      word={current}
      tag={deck.wrongIds.includes(current.id!) ? '다시' : KIND_LABEL[kind]}
      onAnswer={async (known) => {
        await answer(date, kind, current.id!, known)
        setAnswered((n) => n + 1)
      }}
    />,
  )
}

function Shell({
  session,
  kind,
  onKind,
  children,
}: {
  session: DailySession
  kind: DeckKind
  onKind: (k: DeckKind) => void
  children?: ReactNode
}) {
  const deck = deckOf(session, kind)
  const total = deck?.wordIds.length ?? 0
  const done = deck?.doneIds.length ?? 0
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>학습</h1>
      <div className={styles.tabs} role="tablist">
        {(['review', 'new'] as const).map((k) => {
          const d = deckOf(session, k)
          return (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              className={kind === k ? styles.tabOn : ''}
              onClick={() => onKind(k)}
            >
              {KIND_LABEL[k]}
              <span className={styles.tabCount}>
                {d?.doneIds.length ?? 0}/{d?.wordIds.length ?? 0}
              </span>
            </button>
          )
        })}
      </div>
      <div className={styles.track}>
        <div className={styles.bar} style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
      </div>
      {children}
    </div>
  )
}

function Flashcard({ word, tag, onAnswer }: { word: Word; tag: string; onAnswer: (known: boolean) => Promise<void> }) {
  const [flipped, setFlipped] = useState(false)
  const [busy, setBusy] = useState(false)

  async function grade(known: boolean) {
    if (busy) return
    setBusy(true)
    await onAnswer(known)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped && e.key === '1') grade(false)
      else if (flipped && e.key === '2') grade(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const size = word.word.length <= 3 ? styles.lg : word.word.length <= 5 ? styles.md : styles.sm

  return (
    <div className={styles.study}>
      <button
        className={styles.scene}
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? '앞면 보기' : '뒷면 보기'}
      >
        <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
          <div className={`${styles.face} ${styles.front}`}>
            <span className={styles.tag}>{tag}</span>
            <span className={`${styles.frontWord} ${size}`}>{word.word}</span>
            <span className={styles.tapHint}>탭해서 뒤집기</span>
          </div>
          <div className={`${styles.face} ${styles.back}`}>
            <ruby className={styles.backWord}>
              {word.word}
              {word.reading && word.reading !== word.word && <rt>{word.reading}</rt>}
            </ruby>
            <div className={styles.backMeaning}>{word.meaning}</div>
            {(word.example || word.memo) && <div className={styles.divider} />}
            {word.example && <div className={styles.backExample}>{word.example}</div>}
            {word.memo && <div className={styles.backMemo}>{word.memo}</div>}
          </div>
        </div>
      </button>

      {flipped ? (
        <div className={styles.grades}>
          <button className={styles.again} disabled={busy} onClick={() => grade(false)}>모르겠어요</button>
          <button className={styles.good} disabled={busy} onClick={() => grade(true)}>알아요</button>
        </div>
      ) : (
        <button className={styles.reveal} onClick={() => setFlipped(true)}>정답 보기</button>
      )}
      <div className={styles.keys}>Space 뒤집기 · 1 모르겠어요 · 2 알아요</div>
    </div>
  )
}

function NewDone({ session, onReview }: { session: DailySession; onReview: () => void }) {
  const hasMore = useLiveQuery(() => hasMoreNewWords(session), [session])
  const [busy, setBusy] = useState(false)
  const firstTry = session.doneIds.filter((id) => !session.wrongIds.includes(id)).length
  const reviewLeft = session.review?.queue.length ?? 0
  const reviewButton = reviewLeft > 0 && (
    <button className={styles.primary} onClick={onReview}>남은 복습 {reviewLeft}개 하기</button>
  )

  if (session.wordIds.length === 0) {
    return (
      <div className={styles.doneCard}>
        <span className={styles.doneGlyph}>全</span>
        <span className={styles.doneTitle}>모든 단어를 학습했어요</span>
        <span className={styles.doneSub}>새 단어를 더 공부하려면 CSV로 단어를 추가하세요.</span>
        {reviewButton}
      </div>
    )
  }

  async function more() {
    setBusy(true)
    await addMoreToday(session.date)
    setBusy(false)
  }

  return (
    <div className={styles.doneCard}>
      <span className={styles.doneGlyph}>済</span>
      <span className={styles.doneTitle}>오늘 새 단어 끝</span>
      <span className={styles.doneSub}>
        {session.doneIds.length}개 중 {firstTry}개는 한 번에 알았어요. 모두 내일 복습에 나와요.
      </span>
      {reviewButton}
      {hasMore && (
        <button className={reviewLeft > 0 ? styles.secondary : styles.primary} disabled={busy} onClick={more}>
          새 단어 더 하기
        </button>
      )}
    </div>
  )
}

function ReviewDone({ session, onNew }: { session: DailySession; onNew: () => void }) {
  const review = session.review!
  const nextDue = useLiveQuery(async () => {
    const p = await db.progress.where('nextReviewAt').aboveOrEqual(tomorrowStart()).first()
    return p?.nextReviewAt
  })
  const newLeft = session.queue.length
  const firstTry = review.doneIds.filter((id) => !review.wrongIds.includes(id)).length

  return (
    <div className={styles.doneCard}>
      <span className={styles.doneGlyph}>{review.wordIds.length ? '済' : '休'}</span>
      <span className={styles.doneTitle}>{review.wordIds.length ? '오늘 복습 끝' : '오늘 복습할 단어가 없어요'}</span>
      <span className={styles.doneSub}>
        {review.wordIds.length > 0 &&
          `${review.doneIds.length}개 중 ${firstTry}개를 기억했어요. 틀린 ${review.wrongIds.length}개는 내일 다시 나와요. `}
        {nextDue && `다음 복습: ${reviewLabel(nextDue)}`}
      </span>
      {newLeft > 0 && (
        <button className={styles.primary} onClick={onNew}>새 단어 {newLeft}개 하기</button>
      )}
    </div>
  )
}
