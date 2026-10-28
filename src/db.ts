import Dexie, { type EntityTable } from 'dexie'
import { DEFAULT_SETTINGS, type DailySession, type Progress, type Settings, type Word } from './types'

export const db = new Dexie('voca') as Dexie & {
  words: EntityTable<Word, 'id'>
  progress: EntityTable<Progress, 'wordId'>
  settings: EntityTable<Settings, 'id'>
  daily: EntityTable<DailySession, 'date'>
}

db.version(1).stores({
  words: '++id, order, word',
  progress: 'wordId, status, nextReviewAt',
  settings: 'id',
})

db.version(2).stores({
  daily: 'date',
})

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('app')) }
}

export async function saveSettings(patch: Partial<Omit<Settings, 'id'>>) {
  await db.settings.put({ ...(await getSettings()), ...patch, id: 'app' })
}
