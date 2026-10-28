import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db, getSettings } from '../db'
import { todayKey } from '../lib/daily'
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
  return {
    date: new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }),
    total,
    known,
    learning,
    studied: progress.length,
    remaining,
    todayDone: today?.doneIds.length ?? 0,
    // 아직 배정 전이면 오늘 받게 될 개수를 보여준다
    todayTotal: today ? today.wordIds.length : Math.min(settings.dailyNewCount, remaining),
    started: !!today && (today.doneIds.length > 0 || today.wrongIds.length > 0),
  }
}

const pct = (n: number, d: number) => (d ? `${(n / d) * 100}%` : '0%')

export default function Home() {
  const stats = useLiveQuery(loadStats)

  if (!stats) return null

  const { date, total, known, learning, studied, remaining, todayDone, todayTotal, started } = stats
  const todayComplete = todayTotal > 0 && todayDone >= todayTotal

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <span>{date}</span>
        <span className={styles.brand}>ことばノート</span>
      </div>
      <h1 className={styles.title}>오늘도 조금씩</h1>

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
            <span>오늘의 새 단어</span>
            <span className={styles.heroGlyph}>{todayComplete ? '済' : '札'}</span>
          </div>
          <div className={styles.heroCount}>
            <span className={styles.heroNum}>{todayDone}</span>
            <span className={styles.heroOf}>/ {todayTotal}</span>
          </div>
          <div className={styles.heroTrack}>
            <div className={styles.heroBar} style={{ width: pct(todayDone, todayTotal) }} />
          </div>
          <div className={styles.heroFoot}>
            <span>
              {todayTotal === 0
                ? '모든 단어를 학습했어요'
                : todayComplete
                  ? '오늘 목표 달성!'
                  : `${todayTotal - todayDone}개 남음`}
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
