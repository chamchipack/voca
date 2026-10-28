import { useLiveQuery } from 'dexie-react-hooks'
import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveSettings } from '../db'
import { exportBackup, readBackup, restoreBackup } from '../lib/backup'
import { resetTodayIfUntouched } from '../lib/daily'
import type { PickMode, Settings as AppSettings, Theme } from '../types'
import styles from './Settings.module.css'

const MIN_COUNT = 1
const MAX_COUNT = 200
const STEP = 5

const PICK_MODES: { value: PickMode; label: string; desc: string }[] = [
  { value: 'random', label: '무작위', desc: '아직 학습하지 않은 단어 중 무작위로' },
  { value: 'order', label: '순서대로', desc: 'CSV 행 순서대로' },
]

const THEMES: { value: Theme; label: string }[] = [
  { value: 'soft', label: 'Soft' },
  { value: 'mono', label: 'Mono' },
]

export default function Settings() {
  const settings = useLiveQuery(() => getSettings())
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  if (!settings) return null

  /** 하루 개수·뽑는 방식은 오늘 배정에도 영향을 주므로 적용 범위를 안내한다 */
  async function saveStudySetting(patch: Partial<Pick<AppSettings, 'dailyNewCount' | 'pickMode'>>) {
    await saveSettings(patch)
    const reset = await resetTodayIfUntouched()
    setError('')
    setNotice(reset ? '오늘 배정부터 적용됩니다.' : '오늘은 이미 학습을 시작해서 내일부터 적용됩니다.')
  }

  function setCount(n: number) {
    if (!Number.isFinite(n)) return
    const count = Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(n)))
    if (count !== settings!.dailyNewCount) saveStudySetting({ dailyNewCount: count })
  }

  async function onExport() {
    setError('')
    const n = await exportBackup()
    setNotice(`단어 ${n.toLocaleString()}개와 학습 기록을 백업 파일로 저장했습니다.`)
  }

  async function onRestore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setNotice('')
    setError('')
    try {
      const backup = await readBackup(file)
      const when = new Date(backup.exportedAt).toLocaleString()
      const ok = confirm(
        `${when}에 만든 백업(단어 ${backup.words.length.toLocaleString()}개)으로 바꿀까요?\n지금 있는 단어와 학습 기록은 모두 지워집니다.`,
      )
      if (!ok) return
      await restoreBackup(backup)
      setNotice('백업을 불러왔습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>설정</h1>

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.group}>
        <div className={styles.groupTitle}>학습</div>
        <div className={styles.item}>
          <div className={styles.itemText}>
            <span>하루 새 단어 수</span>
            <span className={styles.desc}>복습 단어는 이 수에 포함되지 않아요</span>
          </div>
          <div className={styles.stepper}>
            <button
              aria-label={`${STEP}개 줄이기`}
              disabled={settings.dailyNewCount <= MIN_COUNT}
              onClick={() => setCount(settings.dailyNewCount - STEP)}
            >
              −
            </button>
            <input
              key={settings.dailyNewCount}
              type="number"
              inputMode="numeric"
              min={MIN_COUNT}
              max={MAX_COUNT}
              defaultValue={settings.dailyNewCount}
              aria-label="하루 새 단어 수"
              onBlur={(e) => setCount(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />
            <button
              aria-label={`${STEP}개 늘리기`}
              disabled={settings.dailyNewCount >= MAX_COUNT}
              onClick={() => setCount(settings.dailyNewCount + STEP)}
            >
              +
            </button>
          </div>
        </div>
        <div className={styles.item}>
          <div className={styles.itemText}>
            <span>뽑는 방식</span>
            <span className={styles.desc}>
              {PICK_MODES.find((m) => m.value === settings.pickMode)?.desc}
            </span>
          </div>
          <Segmented
            options={PICK_MODES}
            value={settings.pickMode}
            onChange={(pickMode) => pickMode !== settings.pickMode && saveStudySetting({ pickMode })}
          />
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupTitle}>화면</div>
        <div className={styles.item}>
          <span>테마</span>
          <Segmented options={THEMES} value={settings.theme} onChange={(theme) => saveSettings({ theme })} />
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupTitle}>데이터</div>
        <Link className={styles.row} to="/settings/import">
          <span>CSV 가져오기</span>
          <span className={styles.chevron}>›</span>
        </Link>
        <button className={styles.row} onClick={onExport}>
          <span>백업 내보내기 (JSON)</span>
          <span className={styles.chevron}>›</span>
        </button>
        <button className={styles.row} onClick={() => fileInput.current?.click()}>
          <span>백업 불러오기</span>
          <span className={styles.chevron}>›</span>
        </button>
        <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={onRestore} />
        <p className={styles.groupHint}>
          단어와 학습 기록은 이 브라우저에만 저장됩니다. 브라우저 데이터를 지우거나 기기를 바꾸기 전에 백업을 내보내 두세요.
        </p>
      </section>
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className={styles.segmented} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? styles.segOn : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
