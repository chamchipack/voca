import { useEffect, type ReactNode } from 'react'
import styles from './Sheet.module.css'

/** 화면 아래에서 올라오는 시트. 배경을 누르거나 Esc로 닫힌다 */
export default function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className={styles.handle} />
        {children}
      </div>
    </div>
  )
}
