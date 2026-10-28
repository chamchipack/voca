import { db } from '../db'
import type { Word } from '../types'
import { dropFromToday, todayKey } from './daily'

export type WordDraft = Pick<Word, 'word' | 'reading' | 'meaning' | 'example' | 'memo'>

export async function updateWord(id: number, draft: WordDraft) {
  const reading = draft.reading.trim()
  await db.words.update(id, {
    word: draft.word.trim() || reading,
    reading,
    meaning: draft.meaning.trim(),
    example: draft.example?.trim() || undefined,
    memo: draft.memo?.trim() || undefined,
  })
}

/** 단어와 그 학습 기록을 함께 삭제하고, 오늘 배정에서도 뺀다 */
export async function deleteWord(id: number) {
  await db.transaction('rw', db.words, db.progress, db.daily, async () => {
    await db.words.delete(id)
    await db.progress.delete(id)
    await dropFromToday(todayKey(), id)
  })
}
