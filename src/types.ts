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
  /** 복습 주기가 MATURE_DAYS 이상이면 '외움', 그 전까지는 '학습 중' */
  status: WordStatus
  firstStudiedAt?: number
  lastStudiedAt?: number
  correctCount: number
  wrongCount: number
  /** 다음 복습일(그날 0시, 로컬 시간) */
  nextReviewAt?: number
  /** 지금 복습 주기(일) */
  interval: number
  /** 난이도 계수. 맞힐 때 주기가 이만큼 곱해져 늘어난다. 틀리면 줄어든다 */
  ease: number
  /** 연속으로 맞힌 횟수. 틀리면 0 */
  reps: number
}

/** 하루치 카드 묶음. 날짜별로 저장해서 다 못 하면 이어서 할 수 있다 */
export interface Deck {
  /** 오늘 배정된 단어 전체 */
  wordIds: number[]
  /** 남은 카드 순서. 맨 앞이 지금 카드 */
  queue: number[]
  /** [알아요]로 끝낸 단어 */
  doneIds: number[]
  /** 오늘 한 번이라도 [모르겠어요]를 누른 단어 */
  wrongIds: number[]
}

export type DeckKind = 'new' | 'review'

/** 하루 학습. 새 단어 묶음은 최상위 필드에, 복습 묶음은 review에 둔다 */
export interface DailySession extends Deck {
  /** 로컬 날짜 YYYY-MM-DD */
  date: string
  /** 오늘 복습. 학습 화면을 처음 열 때 그날 복습할 단어로 만든다 */
  review?: Deck
}

export type PickMode = 'random' | 'order'
export type Theme = 'soft' | 'mono'

export interface Settings {
  id: 'app'
  dailyNewCount: number
  pickMode: PickMode
  theme: Theme
  /** 마지막으로 백업을 내보낸 시각. 오래되면 홈에서 백업을 권한다 */
  lastBackupAt?: number
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  dailyNewCount: 20,
  pickMode: 'random',
  theme: 'soft',
}
