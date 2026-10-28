import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db'
import { addMoreToday, answer, dropFromToday, ensureToday, hasMoreNewWords, todayKey } from '../lib/daily'
import type { DailySession, Word } from '../types'
import styles from './Study.module.css'

export default function Study() {
  const date = todayKey()
  const [ready, setReady] = useState(false)
  // 같은 카드가 연속으로 나와도(남은 카드가 1장일 때) 새 카드로 다시 그리기 위한 카운터
  const [answered, setAnswered] = useState(0)

  // 오늘 배정이 없으면 만든다. 이후 화면은 DB를 구독해서 갱신된다
  useEffect(() => {
    ensureToday(date).then(() => setReady(true))
  }, [date])

  const session = useLiveQuery(() => db.daily.get(date), [date])
  const wordCount = useLiveQuery(() => db.words.count())
  const currentId = session?.queue[0]
  const current = useLiveQuery(
    async () => (currentId == null ? null : ((await db.words.get(currentId)) ?? 'missing')),
    [currentId],
  )

  // 배정 후 삭제된 단어는 건너뛴다
  useEffect(() => {
    if (current === 'missing' && currentId != null) dropFromToday(date, currentId)
  }, [current, currentId, date])

  if (!ready || !session || wordCount === undefined) return null

  if (wordCount === 0) {
    return (
      <Shell session={session}>
        <div className={styles.doneCard}>
          <span className={styles.doneGlyph}>空</span>
          <span className={styles.doneTitle}>아직 단어가 없어요</span>
          <Link className={styles.primary} to="/settings/import">CSV 가져오기</Link>
        </div>
      </Shell>
    )
  }

  if (session.queue.length === 0) {
    return (
      <Shell session={session}>
        <Done session={session} />
      </Shell>
    )
  }

  if (!current || current === 'missing') return <Shell session={session} />

  return (
    <Shell session={session}>
      <Flashcard
        key={`${current.id}-${answered}`}
        word={current}
        retry={session.wrongIds.includes(current.id!)}
        onAnswer={async (known) => {
          await answer(date, current.id!, known)
          setAnswered((n) => n + 1)
        }}
      />
    </Shell>
  )
}

function Shell({ session, children }: { session: DailySession; children?: ReactNode }) {
  const total = session.wordIds.length
  const done = session.doneIds.length
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>오늘의 새 단어</h1>
        <span className={styles.progressLabel}>
          {done} / {total}
        </span>
      </div>
      <div className={styles.track}>
        <div className={styles.bar} style={{ width: total ? `${(done / total) * 100}%` : '0%' }} />
      </div>
      {children}
    </div>
  )
}

function Flashcard({ word, retry, onAnswer }: { word: Word; retry: boolean; onAnswer: (known: boolean) => Promise<void> }) {
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
            <span className={styles.tag}>{retry ? '다시' : '새 단어'}</span>
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

function Done({ session }: { session: DailySession }) {
  const hasMore = useLiveQuery(() => hasMoreNewWords(session), [session])
  const [busy, setBusy] = useState(false)
  const firstTry = session.doneIds.filter((id) => !session.wrongIds.includes(id)).length

  if (session.wordIds.length === 0) {
    return (
      <div className={styles.doneCard}>
        <span className={styles.doneGlyph}>全</span>
        <span className={styles.doneTitle}>모든 단어를 학습했어요</span>
        <span className={styles.doneSub}>새 단어를 더 공부하려면 CSV로 단어를 추가하세요.</span>
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
      <span className={styles.doneTitle}>오늘 학습 끝</span>
      <span className={styles.doneSub}>
        {session.doneIds.length}개 중 {firstTry}개는 한 번에 알았어요.
        {session.wrongIds.length > 0 && ` 헷갈린 ${session.wrongIds.length}개는 '학습 중'으로 남겨뒀어요.`}
      </span>
      {hasMore && (
        <button className={styles.primary} disabled={busy} onClick={more}>새 단어 더 하기</button>
      )}
    </div>
  )
}
