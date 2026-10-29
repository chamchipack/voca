import type { Settings } from '../types'

/** 이 기간이 지나도록 백업하지 않으면 홈에서 백업을 권한다 */
export const BACKUP_REMIND_DAYS = 7

/** 저장소 보호를 요청한다. 이미 보호 중이거나 지원하지 않으면 그대로 둔다 */
export async function requestPersist() {
  try {
    if (!navigator.storage?.persist || (await navigator.storage.persisted())) return
    await navigator.storage.persist()
  } catch {
    // 지원하지 않는 브라우저에서는 백업 알림만으로 대비한다
  }
}

/** 브라우저가 데이터를 지우지 않도록 보호 중인지. 확인할 수 없으면 false */
export async function isPersisted() {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

/** 홈 화면에 추가한 앱으로 열었는지 */
export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent))
}

/** 학습 기록이 있는데 백업한 적이 없거나 오래됐으면 true */
export function backupDue(settings: Settings, hasProgress: boolean, now = Date.now()) {
  if (!hasProgress) return false
  if (!settings.lastBackupAt) return true
  return now - settings.lastBackupAt > BACKUP_REMIND_DAYS * 24 * 60 * 60 * 1000
}

/** "3일 전" 같은 표시용 */
export function backupAgo(at: number | undefined, now = Date.now()) {
  if (!at) return '아직 백업한 적 없음'
  const days = Math.floor((now - at) / (24 * 60 * 60 * 1000))
  return days <= 0 ? '오늘 백업함' : `${days}일 전 백업함`
}
