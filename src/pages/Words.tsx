import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Sheet from '../components/Sheet'
import { db } from '../db'
import { deleteWord, updateWord, type WordDraft } from '../lib/words'
import { STATUS_LABEL, type Word, type WordStatus } from '../types'
import styles from './Words.module.css'

type Filter = 'all' | WordStatus
const FILTERS: Filter[] = ['all', 'new', 'learning', 'known']
/** 수천 개를 한 번에 그리지 않도록 스크롤할 때마다 이만큼씩 더 보여준다 */
const PAGE_SIZE = 60

export default function Words() {
  const words = useLiveQuery(() => db.words.orderBy('order').toArray())
  const progress = useLiveQuery(() => db.progress.toArray())
  const [query, setQuery] = useState('')
  const [params] = useSearchParams()
  // 홈의 통계 타일에서 ?status=known 처럼 필터를 지정해 들어올 수 있다
  const [filter, setFilter] = useState<Filter>(() => {
    const status = params.get('status') as Filter | null
    return status && FILTERS.includes(status) ? status : 'all'
  })
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const deferredQuery = useDeferredValue(query)

  const statusOf = useMemo(() => {
    const map = new Map<number, WordStatus>()
    for (const p of progress ?? []) map.set(p.wordId, p.status)
    return (id: number) => map.get(id) ?? 'new'
  }, [progress])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, new: 0, learning: 0, known: 0 }
    for (const w of words ?? []) {
      c.all++
      c[statusOf(w.id!)]++
    }
    return c
  }, [words, statusOf])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return (words ?? []).filter(
      (w) =>
        (filter === 'all' || statusOf(w.id!) === filter) &&
        (!q || [w.word, w.reading, w.meaning, w.memo].some((s) => s?.toLowerCase().includes(q))),
    )
  }, [words, statusOf, filter, deferredQuery])

  const sentinel = useRef<HTMLDivElement>(null)
  const hasMore = filtered.length > limit
  useEffect(() => {
    const el = sentinel.current
    if (!el || !hasMore) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + PAGE_SIZE), {
      rootMargin: '400px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [hasMore, limit])

  const detail = detailId != null ? words?.find((w) => w.id === detailId) : undefined
  const closeSheet = () => {
    setDetailId(null)
    setEditing(false)
  }

  if (!words || !progress) return null

  if (words.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>단어 목록</h1>
        <div className={styles.emptyCard}>
          <p>아직 단어가 없어요.</p>
          <Link className={styles.primary} to="/settings/import">CSV 가져오기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>단어 목록</h1>
      <input
        className={styles.search}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setLimit(PAGE_SIZE)
        }}
        placeholder="한자, 읽기, 뜻으로 검색"
      />
      <div className={styles.chips}>
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`${styles.chip} ${filter === f ? styles.chipOn : ''}`}
            onClick={() => {
              setFilter(f)
              setLimit(PAGE_SIZE)
            }}
          >
            {f === 'all' ? '전체' : STATUS_LABEL[f]} {counts[f].toLocaleString()}
          </button>
        ))}
      </div>
      <span className={styles.count}>{filtered.length.toLocaleString()}개 단어</span>

      <div className={styles.grid}>
        {filtered.slice(0, limit).map((w) => (
          <button key={w.id} className={styles.card} onClick={() => setDetailId(w.id!)}>
            <span className={`${styles.status} ${styles[statusOf(w.id!)]}`}>{STATUS_LABEL[statusOf(w.id!)]}</span>
            <WordText word={w} className={styles.cardWord} />
            <span className={styles.cardMeaning}>{w.meaning}</span>
          </button>
        ))}
      </div>
      {hasMore && <div ref={sentinel} className={styles.sentinel} />}
      {filtered.length === 0 && <div className={styles.noResult}>검색 결과가 없어요</div>}

      {detail && (
        <Sheet onClose={closeSheet}>
          {editing ? (
            <WordEditor word={detail} onDone={() => setEditing(false)} />
          ) : (
            <WordDetail
              word={detail}
              status={statusOf(detail.id!)}
              onEdit={() => setEditing(true)}
              onDeleted={closeSheet}
            />
          )}
        </Sheet>
      )}
    </div>
  )
}

function WordText({ word, className }: { word: Word; className: string }) {
  return (
    <ruby className={className}>
      {word.word}
      {word.reading && word.reading !== word.word && <rt>{word.reading}</rt>}
    </ruby>
  )
}

function WordDetail({
  word,
  status,
  onEdit,
  onDeleted,
}: {
  word: Word
  status: WordStatus
  onEdit: () => void
  onDeleted: () => void
}) {
  async function remove() {
    if (!confirm(`'${word.word}'을(를) 삭제할까요? 학습 기록도 함께 삭제됩니다.`)) return
    await deleteWord(word.id!)
    onDeleted()
  }

  return (
    <>
      <span className={`${styles.status} ${styles[status]}`}>{STATUS_LABEL[status]}</span>
      <WordText word={word} className={styles.detailWord} />
      <div className={styles.detailMeaning}>{word.meaning}</div>
      {word.example && <div className={`${styles.box} ${styles.example}`}>{word.example}</div>}
      {word.memo && <div className={styles.box}>{word.memo}</div>}
      <div className={styles.actions}>
        <button className={styles.secondary} onClick={remove}>삭제</button>
        <button className={styles.primary} onClick={onEdit}>편집</button>
      </div>
    </>
  )
}

const EDIT_FIELDS: { key: keyof WordDraft; label: string; jp?: boolean; multiline?: boolean }[] = [
  { key: 'word', label: '한자 표기', jp: true },
  { key: 'reading', label: '읽는 법', jp: true },
  { key: 'meaning', label: '뜻 (필수)' },
  { key: 'example', label: '예문', jp: true, multiline: true },
  { key: 'memo', label: '메모', multiline: true },
]

function WordEditor({ word, onDone }: { word: Word; onDone: () => void }) {
  const [draft, setDraft] = useState<WordDraft>({
    word: word.word,
    reading: word.reading,
    meaning: word.meaning,
    example: word.example ?? '',
    memo: word.memo ?? '',
  })
  const valid = (draft.word.trim() || draft.reading.trim()) && draft.meaning.trim()

  async function save() {
    if (!valid) return
    await updateWord(word.id!, draft)
    onDone()
  }

  return (
    <>
      <div className={styles.editorHeader}>
        <span className={styles.editorTitle}>단어 편집</span>
        <button className={styles.close} onClick={onDone} aria-label="취소">✕</button>
      </div>
      {EDIT_FIELDS.map((f) => {
        const props = {
          className: `${styles.input} ${f.jp ? styles.jpInput : ''}`,
          value: draft[f.key] ?? '',
          onChange: (e: { target: { value: string } }) => setDraft({ ...draft, [f.key]: e.target.value }),
        }
        return (
          <label key={f.key} className={styles.field}>
            {f.label}
            {f.multiline ? <textarea rows={2} {...props} /> : <input {...props} />}
          </label>
        )
      })}
      <p className={styles.hint}>한자 표기나 읽는 법을 바꾸면, 나중에 CSV를 다시 가져올 때 다른 단어로 취급됩니다.</p>
      <button className={styles.primary} disabled={!valid} onClick={save}>저장</button>
    </>
  )
}
