// 单词静态数据（来自 cet4.json，构建时打包）
export interface Word {
  id: number
  word: string
  phonetic: string
  pos: string // 词性，如 "v." "n." "a."
  translation: string // 中文释义（多条以 \n 分隔）
  definition: string // 英文释义（多条以 \n 分隔）
  example: string // 英文例句
  exampleTrans: string // 例句中文翻译
  collins: number // 柯林斯星级 0-5
  frq: number // 当代语料库词频排序（越小越高频）
}

// 单词学习状态
export type WordStatus =
  | 'new' // 未接触
  | 'unknown' // 闪过判定为不认识
  | 'vague' // 闪过判定为模糊
  | 'learning' // 正在学习
  | 'review' // 进入复习队列
  | 'mastered' // 已掌握

// 单词学习进度（持久化于 localStorage）
export interface WordProgress {
  wordId: number
  status: WordStatus
  familiarity: number // 0-5，闪过/复习时的熟悉度
  // SM-2 间隔重复算法字段
  reps: number // 完整复习次数
  ef: number // 难度系数，初始 2.5
  interval: number // 下次复习间隔（天）
  nextReview: number // 下次复习时间戳（ms）
  lastReview: number // 上次复习时间戳（ms）
  // 统计
  totalSeen: number // 总曝光次数
  correctCount: number // 答对次数
}

// 闪过判定结果
export type FlashJudgment = 'known' | 'vague' | 'unknown'

export interface FlashRecord {
  wordId: number
  judgment: FlashJudgment
  timestamp: number
}

// 每日学习记录
export interface DailyRecord {
  date: string // YYYY-MM-DD
  learned: number
  reviewed: number
  flashed: number
  tested: number
}

// 测试题型
export type QuizType = 'cn-en' | 'en-cn' | 'spell'

// 一次测试结果
export interface QuizResult {
  id: number
  date: string // ISO 时间戳
  type: QuizType
  total: number
  correct: number
  duration: number // 秒
}

// 用户整体统计
export interface UserStats {
  totalWords: number
  masteredCount: number
  learningCount: number
  reviewDueCount: number
  streak: number // 连续打卡天数
  lastStudyDate: string
  history: DailyRecord[]
}
