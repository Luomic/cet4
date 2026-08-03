import type { WordProgress } from '@/types'

const DAY_MS = 86_400_000

// SM-2 间隔重复算法
// q: 回想质量 0-5，>=3 视为通过
// 参考：https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
export function sm2(progress: WordProgress, q: number): Partial<WordProgress> {
  let ef = progress.ef || 2.5
  let reps = progress.reps || 0
  let interval = progress.interval || 0

  if (q >= 3) {
    // 答对：推进间隔
    if (reps === 0) interval = 1
    else if (reps === 1) interval = 6
    else interval = Math.round(interval * ef)
    reps += 1
  } else {
    // 答错：重置
    reps = 0
    interval = 1
  }

  // 更新难度系数 EF
  ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  if (ef < 1.3) ef = 1.3
  ef = Math.round(ef * 100) / 100

  const nextReview = Date.now() + interval * DAY_MS

  // 掌握判定：间隔 >= 21 天且完整复习 >= 3 次
  const mastered = interval >= 21 && reps >= 3

  return {
    ef,
    reps,
    interval,
    nextReview,
    status: mastered ? 'mastered' : 'review',
    lastReview: Date.now(),
    totalSeen: progress.totalSeen + 1,
    correctCount: progress.correctCount + (q >= 3 ? 1 : 0),
  }
}

// 格式化间隔为人类可读
export function formatInterval(days: number): string {
  if (days <= 0) return '今天'
  if (days === 1) return '明天'
  if (days < 30) return `${days} 天后`
  const months = Math.round(days / 30)
  if (months < 12) return `${months} 个月后`
  return `${Math.round(months / 12)} 年后`
}
