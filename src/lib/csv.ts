import Papa from 'papaparse'

export type CsvEncoding = 'auto' | 'utf-8' | 'euc-kr' | 'shift_jis'

/** 매핑 대상 필드. word, meaning은 필수 */
export const FIELDS = [
  { key: 'word', label: '한자 표기', required: true },
  { key: 'reading', label: '읽는 법', required: false },
  { key: 'meaning', label: '뜻', required: true },
  { key: 'example', label: '예문', required: false },
  { key: 'memo', label: '메모', required: false },
] as const

export type FieldKey = (typeof FIELDS)[number]['key']
/** 필드별 열 번호. -1은 사용 안 함 */
export type ColumnMapping = Record<FieldKey, number>

const HEADER_HINTS: Record<FieldKey, string[]> = {
  word: ['단어', '한자', '표기', 'word', 'kanji', '漢字', '単語'],
  reading: ['읽', '요미', '후리가나', 'reading', 'kana', 'yomi', '読み', 'よみ', 'ふりがな'],
  meaning: ['뜻', '의미', '해석', 'meaning', 'korean', '意味'],
  example: ['예문', 'example', 'sentence', '例文'],
  memo: ['메모', '비고', 'memo', 'note', 'メモ'],
}

/**
 * 파일을 문자열로 디코딩한다. 자동 모드에서는 UTF-8로 읽어보고,
 * 깨지면 엑셀 한국어 기본값인 EUC-KR(CP949)로 다시 읽는다.
 */
export async function decodeFile(file: File, encoding: CsvEncoding): Promise<string> {
  const buf = await file.arrayBuffer()
  if (encoding !== 'auto') return new TextDecoder(encoding).decode(buf)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('euc-kr').decode(buf)
  }
}

export function parseCsv(text: string): string[][] {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: 'greedy' })
  return result.data.map((row) => row.map((cell) => cell.trim()))
}

/** 첫 줄이 제목 줄로 보이면 제목으로 매핑을 추측, 아니면 열 순서대로 */
export function guessMapping(firstRow: string[]): { mapping: ColumnMapping; hasHeader: boolean } {
  const mapping = { word: -1, reading: -1, meaning: -1, example: -1, memo: -1 } as ColumnMapping
  const used = new Set<number>()
  for (const { key } of FIELDS) {
    const idx = firstRow.findIndex(
      (cell, i) => !used.has(i) && HEADER_HINTS[key].some((h) => cell.toLowerCase().includes(h)),
    )
    if (idx >= 0) {
      mapping[key] = idx
      used.add(idx)
    }
  }
  if (used.size > 0) return { mapping, hasHeader: true }

  const n = firstRow.length
  return {
    mapping: {
      word: 0,
      reading: n > 1 ? 1 : -1,
      meaning: n > 2 ? 2 : n > 1 ? 1 : -1,
      example: n > 3 ? 3 : -1,
      memo: n > 4 ? 4 : -1,
    },
    hasHeader: false,
  }
}
