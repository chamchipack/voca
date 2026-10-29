import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db, getSettings } from '../db'
import { exportBackup } from '../lib/backup'
import { dueWordIds, todayKey } from '../lib/daily'
import { backupAgo, backupDue } from '../lib/storage'
import styles from './Home.module.css'

/** 홈은 오늘 배정을 만들지 않고 읽기만 한다. 배정은 학습 화면을 열 때 만들어진다 */
async function loadStats() {
  const [total, progress, today, settings] = await Promise.all([
    db.words.count(),
    db.progress.toArray(),
    db.daily.get(todayKey()),
    getSettings(),
  ])
  const known = progress.filter((p) => p.status === 'known').length
  const learning = progress.filter((p) => p.status === 'learning').length
  const remaining = Math.max(0, total - progress.length)
  // 아직 배정 전이면 오늘 받게 될 개수를 보여준다
  const newTotal = today ? today.wordIds.length : Math.min(settings.dailyNewCount, remaining)
  const reviewTotal = today?.review ? today.review.wordIds.length : (await dueWordIds(today?.wordIds)).length
  const newDone = today?.doneIds.length ?? 0
  const reviewDone = today?.review?.doneIds.length ?? 0
  const touched = (n: number[] | undefined) => !!n && n.length > 0
  return {
    date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }),
    total,
    known,
    learning,
    studied: progress.length,
    remaining,
    newDone,
    newTotal,
    reviewDone,
    reviewTotal,
    backupDue: backupDue(settings, progress.length > 0),
    lastBackupAt: settings.lastBackupAt,
    started:
      touched(today?.doneIds) ||
      touched(today?.wrongIds) ||
      touched(today?.review?.doneIds) ||
      touched(today?.review?.wrongIds),
  }
}

const pct = (n: number, d: number) => (d ? `${(n / d) * 100}%` : '0%')

export default function Home() {
  const stats = useLiveQuery(loadStats)

  if (!stats) return null

  const {
    date,
    total,
    known,
    learning,
    studied,
    remaining,
    newDone,
    newTotal,
    reviewDone,
    reviewTotal,
    started,
    backupDue,
    lastBackupAt,
  } = stats
  const todayDone = newDone + reviewDone
  const todayTotal = newTotal + reviewTotal
  const todayLeft = todayTotal - todayDone
  const todayComplete = todayTotal > 0 && todayLeft <= 0

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <span>{date}</span>
        <span className={styles.brand}>ことばノート</span>
      </div>
      <h1 className={styles.title}>오늘도 조금씩</h1>

      {backupDue && <BackupBanner lastBackupAt={lastBackupAt} />}

      {total === 0 ? (
        <Link className={styles.hero} to="/settings/import">
          <div className={styles.heroHead}>
            <span>시작하기</span>
            <span className={styles.heroGlyph}>始</span>
          </div>
          <div className={styles.heroBody}>CSV로 단어장을 가져오세요</div>
          <div className={styles.heroFoot}>
            <span />
            <span className={styles.heroBtn}>CSV 가져오기</span>
          </div>
        </Link>
      ) : (
        <Link className={styles.hero} to="/study">
          <div className={styles.heroHead}>
            <span>오늘 학습</span>
            <span className={styles.heroGlyph}>{todayComplete ? '済' : '札'}</span>
          </div>
          <div className={styles.heroCount}>
            <span className={styles.heroNum}>{todayComplete ? todayDone : todayLeft}</span>
            <span className={styles.heroOf}>{todayComplete ? '단어 완료' : '단어 남음'}</span>
          </div>
          <div className={styles.heroTrack}>
            <div className={styles.heroBar} style={{ width: pct(todayDone, todayTotal) }} />
          </div>
          <div className={styles.heroFoot}>
            <span>
              {todayTotal === 0
                ? '오늘은 복습도 새 단어도 없어요'
                : `복습 ${reviewDone}/${reviewTotal} · 새 단어 ${newDone}/${newTotal}`}
            </span>
            <span className={styles.heroBtn}>
              {todayComplete || todayTotal === 0 ? '학습 화면' : started ? '이어서 하기' : '시작하기'}
            </span>
          </div>
        </Link>
      )}

      {total > 0 && (
        <>
          <section className={styles.overall}>
            <div className={styles.overallHead}>
              <span>전체 진행</span>
              <span className={styles.overallPct}>{Math.floor((studied / total) * 100)}%</span>
            </div>
            <div className={styles.stack} aria-hidden>
              <div className={styles.stackKnown} style={{ width: pct(known, total) }} />
              <div className={styles.stackLearning} style={{ width: pct(learning, total) }} />
            </div>
            <div className={styles.legend}>
              <span><i className={styles.dotKnown} />외움</span>
              <span><i className={styles.dotLearning} />학습 중</span>
              <span><i className={styles.dotNew} />남은 단어</span>
            </div>
          </section>

          <div className={styles.tiles}>
            <Tile label="학습한 단어" value={studied} of={total} />
            <Tile label="남은 단어" value={remaining} />
            <Tile label="외움" value={known} to="/words?status=known" />
            <Tile label="학습 중" value={learning} to="/words?status=learning" />
          </div>
        </>
      )}
    </div>
  )
}

/** 학습 기록은 이 브라우저에만 있으므로 백업이 오래되면 권한다 */
function BackupBanner({ lastBackupAt }: { lastBackupAt?: number }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className={styles.backup} role="status">
      <div className={styles.backupText}>
        <span className={styles.backupTitle}>백업할 때가 됐어요</span>
        <span className={styles.backupSub}>{backupAgo(lastBackupAt)} · 기록은 이 기기에만 있어요</span>
      </div>
      <button
        className={styles.backupBtn}
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await exportBackup()
          setBusy(false)
        }}
      >
        지금 백업
      </button>
    </div>
  )
}

function Tile({ label, value, of, to }: { label: string; value: number; of?: number; to?: string }) {
  const body = (
    <>
      <span className={styles.tileLabel}>{label}</span>
      <div className={styles.tileValue}>
        <span className={styles.tileNum}>{value.toLocaleString()}</span>
        {of !== undefined && <span className={styles.tileOf}>/ {of.toLocaleString()}</span>}
      </div>
    </>
  )
  return to ? (
    <Link className={styles.tile} to={to}>{body}</Link>
  ) : (
    <div className={styles.tile}>{body}</div>
  )
}
