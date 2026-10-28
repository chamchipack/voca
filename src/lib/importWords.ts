import { db } from '../db'
import type { Word } from '../types'
import type { ColumnMapping } from './csv'

export interface ImportResult {
  added: number
  updated: number
  skipped: number
}

const keyOf = (word: string, reading: string) => `${word}\u0000${reading}`

export function toWord(row: string[], mapping: ColumnMapping, order: number): Omit<Word, 'id'> {
  const cell = (i: number) => (i >= 0 ? (row[i] ?? '').trim() : '')
  const reading = cell(mapping.reading)
  const example = cell(mapping.example)
  const memo = cell(mapping.memo)
  return {
    // 히라가나만 있는 단어는 한자 칸이 비어 있을 수 있으므로 읽는 법으로 대신한다
    word: cell(mapping.word) || reading,
    reading,
    meaning: cell(mapping.meaning),
    ...(example && { example }),
    ...(memo && { memo }),
    order,
  }
}

/**
 * 같은 한자 표기+읽는 법의 단어가 이미 있으면 id를 유지한 채 내용만 갱신한다.
 * id가 그대로이므로 학습 기록(progress)은 영향을 받지 않는다.
 * CSV에 없는 기존 단어는 삭제하지 않는다.
 */
export async function importWords(rows: string[][], mapping: ColumnMapping): Promise<ImportResult> {
  return db.transaction('rw', db.words, async () => {
    const existing = new Map<string, Word>()
    for (const w of await db.words.toArray()) existing.set(keyOf(w.word, w.reading), w)

    const toAdd: Omit<Word, 'id'>[] = []
    const toUpdate: Word[] = []
    const seen = new Set<string>()
    let skipped = 0

    rows.forEach((row, i) => {
      const w = toWord(row, mapping, i + 1)
      const key = keyOf(w.word, w.reading)
      if (!w.word || !w.meaning || seen.has(key)) {
        skipped++
        return
      }
      seen.add(key)
      const prev = existing.get(key)
      if (prev) toUpdate.push({ ...w, id: prev.id })
      else toAdd.push(w)
    })

    await db.words.bulkPut(toUpdate)
    await db.words.bulkAdd(toAdd as Word[])
    return { added: toAdd.length, updated: toUpdate.length, skipped }
  })
}
