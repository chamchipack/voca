export type WordStatus = 'new' | 'learning' | 'known'

export const STATUS_LABEL: Record<WordStatus, string> = {
  new: '새 단어',
  learning: '학습 중',
  known: '외움',
}

export interface Word {
  id?: number
  word: string
  reading: string
  meaning: string
  example?: string
  memo?: string
  /** CSV 행 번호 (순서대로 모드에서 사용) */
  order: number
}

/** 단어와 분리된 학습 기록. CSV를 다시 가져와도 유지된다. */
export interface Progress {
  wordId: number
  status: WordStatus
  firstStudiedAt?: number
  lastStudiedAt?: number
  correctCount: number
  wrongCount: number
  nextReviewAt?: number
}

/** 하루치 새 단어 배정. 날짜별로 저장해서 다 못 하면 이어서 할 수 있다 */
export interface DailySession {
  /** 로컬 날짜 YYYY-MM-DD */
  date: string
  /** 오늘 배정된 단어 전체 */
  wordIds: number[]
  /** 남은 카드 순서. 맨 앞이 지금 카드 */
  queue: number[]
  /** [알아요]로 끝낸 단어 */
  doneIds: number[]
  /** 오늘 한 번이라도 [모르겠어요]를 누른 단어 */
  wrongIds: number[]
}

export type PickMode = 'random' | 'order'
export type Theme = 'soft' | 'mono'

export interface Settings {
  id: 'app'
  dailyNewCount: number
  pickMode: PickMode
  theme: Theme
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  dailyNewCount: 20,
  pickMode: 'random',
  theme: 'soft',
}
