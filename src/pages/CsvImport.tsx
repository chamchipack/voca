import { useMemo, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  FIELDS,
  decodeFile,
  guessMapping,
  parseCsv,
  type ColumnMapping,
  type CsvEncoding,
  type FieldKey,
} from '../lib/csv'
import { importWords, toWord, type ImportResult } from '../lib/importWords'
import styles from './CsvImport.module.css'

const ENCODINGS: { value: CsvEncoding; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'utf-8', label: 'UTF-8' },
  { value: 'euc-kr', label: 'EUC-KR' },
  { value: 'shift_jis', label: 'Shift_JIS' },
]

const PREVIEW_ROWS = 5

const columnName = (i: number) => {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

export default function CsvImport() {
  const [file, setFile] = useState<File | null>(null)
  const [encoding, setEncoding] = useState<CsvEncoding>('auto')
  const [rows, setRows] = useState<string[][]>([])
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function load(f: File, enc: CsvEncoding) {
    setError('')
    setResult(null)
    try {
      const parsed = parseCsv(await decodeFile(f, enc))
      if (parsed.length === 0) {
        setError('CSV에 내용이 없습니다.')
        setRows([])
        setMapping(null)
        return
      }
      const guess = guessMapping(parsed[0])
      setRows(parsed)
      setHasHeader(guess.hasHeader)
      setMapping(guess.mapping)
    } catch {
      setError('파일을 읽지 못했습니다. 문자 인코딩을 바꿔서 다시 시도해 보세요.')
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    load(f, encoding)
  }

  function onEncoding(enc: CsvEncoding) {
    setEncoding(enc)
    if (file) load(file, enc)
  }

  const columnCount = useMemo(() => rows.reduce((m, r) => Math.max(m, r.length), 0), [rows])
  const dataRows = hasHeader ? rows.slice(1) : rows
  const columnOptions = Array.from({ length: columnCount }, (_, i) => {
    // 제목 줄이 있으면 제목, 없으면 첫 행 값을 보여준다
    const sample = rows[0][i]
    return { value: i, label: `${columnName(i)}열${sample ? ` · ${sample.slice(0, 16)}` : ''}` }
  })
  const missing = mapping ? FIELDS.filter((f) => f.required && mapping[f.key] < 0) : []

  async function runImport() {
    if (!mapping) return
    setBusy(true)
    setError('')
    try {
      setResult(await importWords(dataRows, mapping))
    } catch (e) {
      setError(`가져오기에 실패했습니다: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setFile(null)
    setRows([])
    setMapping(null)
    setResult(null)
    setError('')
  }

  if (result) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>가져오기 완료</h1>
        <div className={styles.card}>
          <div className={styles.stats}>
            <Stat label="새로 추가" value={result.added} />
            <Stat label="내용 갱신" value={result.updated} />
            <Stat label="건너뜀" value={result.skipped} />
          </div>
          <p className={styles.hint}>
            이미 있던 단어(한자 표기+읽는 법이 같은 단어)는 내용만 갱신되고 학습 기록은 그대로 유지됩니다.
            건너뜀은 한자 표기나 뜻이 비어 있거나 CSV 안에서 중복된 행입니다.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondary} onClick={reset}>다른 파일 가져오기</button>
          <Link className={styles.primary} to="/words">단어 목록 보기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link className={styles.back} to="/settings" aria-label="설정으로">‹</Link>
        <h1 className={styles.title}>CSV 가져오기</h1>
      </div>

      <section className={styles.card}>
        <label className={styles.file}>
          <input type="file" accept=".csv,text/csv" onChange={onFile} />
          <span className={styles.fileButton}>파일 선택</span>
          <span className={styles.fileName}>{file ? file.name : '구글시트/엑셀에서 내보낸 CSV'}</span>
        </label>
        <div className={styles.field}>
          문자 인코딩
          <div className={styles.chips}>
            {ENCODINGS.map((e) => (
              <button
                key={e.value}
                className={`${styles.chip} ${encoding === e.value ? styles.chipOn : ''}`}
                onClick={() => onEncoding(e.value)}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className={styles.error}>{error}</p>}

      {mapping && (
        <>
          <section className={styles.card}>
            <div className={styles.cardTitle}>열 매핑</div>
            <label className={styles.check}>
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
              첫 줄은 제목 줄 (가져오지 않음)
            </label>
            {FIELDS.map((f) => (
              <label key={f.key} className={styles.field}>
                {f.label}
                {f.required && ' (필수)'}
                <select
                  className={styles.select}
                  value={mapping[f.key]}
                  onChange={(e) => setMapping({ ...mapping, [f.key as FieldKey]: Number(e.target.value) })}
                >
                  <option value={-1}>사용 안 함</option>
                  {columnOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            ))}
          </section>

          <section className={styles.card}>
            <div className={styles.cardTitle}>
              미리보기 <span className={styles.count}>총 {dataRows.length.toLocaleString()}행</span>
            </div>
            <div className={styles.preview}>
              {dataRows.slice(0, PREVIEW_ROWS).map((row, i) => {
                const w = toWord(row, mapping, i + 1)
                return (
                  <div key={i} className={styles.previewRow}>
                    <div className={styles.jp}>
                      {w.word || <em className={styles.empty}>비어 있음</em>}
                      {w.reading && w.reading !== w.word && <span className={styles.reading}>{w.reading}</span>}
                    </div>
                    <div className={styles.meaning}>{w.meaning || <em className={styles.empty}>뜻 없음</em>}</div>
                    {w.example && <div className={styles.example}>{w.example}</div>}
                  </div>
                )
              })}
            </div>
          </section>

          <button
            className={styles.primary}
            disabled={busy || missing.length > 0 || dataRows.length === 0}
            onClick={runImport}
          >
            {busy
              ? '가져오는 중…'
              : missing.length > 0
                ? `${missing.map((f) => f.label).join(', ')} 열을 선택하세요`
                : `${dataRows.length.toLocaleString()}개 가져오기`}
          </button>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value.toLocaleString()}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  )
}
