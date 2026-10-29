import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { getSettings } from '../db'
import styles from './Layout.module.css'

const TABS = [
  { to: '/', glyph: '家', label: '홈' },
  { to: '/study', glyph: '札', label: '학습' },
  { to: '/words', glyph: '辞', label: '단어 목록' },
  { to: '/settings', glyph: '設', label: '설정' },
]

export default function Layout() {
  const theme = useLiveQuery(async () => (await getSettings()).theme)
  useEffect(() => {
    if (!theme) return
    document.documentElement.dataset.theme = theme
    // 홈 화면 앱의 상단 상태바 색도 테마에 맞춘다
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'mono' ? '#0e0e0d' : '#eef0f6')
    try {
      localStorage.setItem('voca-theme', theme)
    } catch {
      // 저장소를 못 쓰는 환경에서는 깜빡임 방지만 포기한다
    }
  }, [theme])

  return (
    <div className={styles.shell}>
      <nav className={styles.nav}>
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.glyph}>{t.glyph}</span>
            <span className={styles.label}>{t.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
