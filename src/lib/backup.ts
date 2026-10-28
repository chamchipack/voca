import { db } from '../db'
import { todayKey } from './daily'
import type { DailySession, Progress, Settings, Word } from '../types'

const APP = 'voca'
const VERSION = 1

export interface Backup {
  app: typeof APP
  version: number
  exportedAt: string
  words: Word[]
  progress: Progress[]
  settings: Settings[]
  daily: DailySession[]
}

export async function exportBackup() {
  const backup: Backup = {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    words: await db.words.toArray(),
    progress: await db.progress.toArray(),
    settings: await db.settings.toArray(),
    daily: await db.daily.toArray(),
  }
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `voca-backup-${todayKey()}.json`
  a.click()
  URL.revokeObjectURL(url)
  return backup.words.length
}

/** 백업 파일을 읽어 검사한다. 형식이 맞지 않으면 에러를 던진다 */
export async function readBackup(file: File): Promise<Backup> {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('JSON 파일이 아닙니다.')
  }
  const b = data as Partial<Backup>
  if (b?.app !== APP || !Array.isArray(b.words) || !Array.isArray(b.progress)) {
    throw new Error('이 앱의 백업 파일이 아닙니다.')
  }
  if ((b.version ?? 0) > VERSION) throw new Error('더 새 버전의 앱에서 만든 백업입니다.')
  return { ...b, settings: b.settings ?? [], daily: b.daily ?? [] } as Backup
}

/** 현재 데이터를 모두 지우고 백업 내용으로 바꾼다 */
export async function restoreBackup(b: Backup) {
  await db.transaction('rw', db.words, db.progress, db.settings, db.daily, async () => {
    await Promise.all([db.words.clear(), db.progress.clear(), db.settings.clear(), db.daily.clear()])
    await db.words.bulkPut(b.words)
    await db.progress.bulkPut(b.progress)
    await db.settings.bulkPut(b.settings)
    await db.daily.bulkPut(b.daily)
  })
}
