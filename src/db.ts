import Dexie, { type EntityTable } from 'dexie'
import { withSrsDefaults } from './lib/srs'
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

// 복습(간격 반복) 필드 추가. 기존 학습 기록은 마지막 학습 다음 날 복습하도록 채운다
db.version(3)
  .stores({})
  .upgrade((tx) =>
    tx
      .table('progress')
      .toCollection()
      .modify((p: Progress) => Object.assign(p, withSrsDefaults(p))),
  )

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await db.settings.get('app')) }
}

export async function saveSettings(patch: Partial<Omit<Settings, 'id'>>) {
  await db.settings.put({ ...(await getSettings()), ...patch, id: 'app' })
}
