import type { Progress } from '../types'

/** 복습 주기가 이 일수 이상이면 '외움'으로 본다 */
export const MATURE_DAYS = 21
export const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3
const MAX_EASE = 3
const EASE_STEP_DOWN = 0.2
const EASE_STEP_UP = 0.05

export function dayStart(t = Date.now()) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function addDays(t: number, days: number) {
  const d = new Date(t)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

/** 오늘 복습할 단어인지 판단하는 기준 시각(내일 0시) */
export const tomorrowStart = () => addDays(dayStart(), 1)

/**
 * 오늘 처음 채점한 결과로 다음 복습일을 정한다 (SM-2를 버튼 두 개에 맞게 단순화).
 * - 알아요: 1일 → 3일 → 이후 주기 × 난이도 계수. 계수는 조금 오른다
 * - 모르겠어요: 연속 횟수를 0으로, 내일 다시. 계수는 내려간다
 * 같은 날 다시 나온 카드(틀린 뒤 재출제)는 이 함수를 거치지 않는다.
 */
export function schedule(p: Progress, known: boolean, now = Date.now()): Progress {
  let { interval, ease, reps } = p
  if (known) {
    reps++
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.max(interval + 1, Math.round(interval * ease))
    ease = Math.min(MAX_EASE, ease + EASE_STEP_UP)
  } else {
    reps = 0
    interval = 1
    ease = Math.max(MIN_EASE, ease - EASE_STEP_DOWN)
  }
  return {
    ...p,
    interval,
    ease,
    reps,
    nextReviewAt: addDays(dayStart(now), interval),
    status: interval >= MATURE_DAYS ? 'known' : 'learning',
  }
}

/**
 * 복습 필드가 없는 예전 기록(복습 기능 이전 데이터, 예전 백업)에 기본값을 채운다.
 * 마지막 학습 다음 날 복습하도록 둔다.
 */
export function withSrsDefaults(p: Partial<Progress> & Pick<Progress, 'wordId'>): Progress {
  if (p.interval !== undefined && p.ease !== undefined && p.reps !== undefined) return p as Progress
  // 예전 규칙의 '외움'은 한 번에 맞힌 단어였으므로 1회 정답으로 본다. 주기가 1일이라 상태는 '학습 중'이 된다
  const known = p.status === 'known'
  return {
    correctCount: 0,
    wrongCount: 0,
    ...p,
    status: 'learning',
    interval: 1,
    ease: known ? DEFAULT_EASE : DEFAULT_EASE - EASE_STEP_DOWN,
    reps: known ? 1 : 0,
    nextReviewAt: p.nextReviewAt ?? addDays(dayStart(p.lastStudiedAt ?? Date.now()), 1),
  }
}

/** 다음 복습일을 '오늘', '내일', 'n일 후'로 */
export function reviewLabel(nextReviewAt: number | undefined) {
  if (nextReviewAt === undefined) return ''
  const days = Math.round((dayStart(nextReviewAt) - dayStart()) / 86_400_000)
  if (days <= 0) return '오늘'
  if (days === 1) return '내일'
  return `${days}일 후`
}
