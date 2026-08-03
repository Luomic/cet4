import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import wordsData from '@/data/cet4.json'
import type { Word, WordProgress, WordStatus, DailyRecord, QuizResult } from '@/types'
import { load, save } from '@/utils/storage'
import { sm2 } from '@/utils/srs'

const PROGRESS_KEY = 'progress'

export const useWordsStore = defineStore('words', () => {
  const words = ref(wordsData as Word[])

  // 进度以 [wordId, WordProgress][] 数组持久化，运行时用 Map
  const progressMap = ref<Map<number, WordProgress>>(
    new Map(load<[number, WordProgress][]>(PROGRESS_KEY, [])),
  )
  // 每日活动记录与测试历史
  const daily = ref<Record<string, DailyRecord>>(load('daily', {}))
  const quizHistory = ref<QuizResult[]>(load('quizHistory', []))

  function persist() {
    save(PROGRESS_KEY, Array.from(progressMap.value.entries()))
  }

  function getWord(id: number): Word | undefined {
    return words.value.find((w) => w.id === id)
  }

  function getProgress(wordId: number): WordProgress | undefined {
    return progressMap.value.get(wordId)
  }

  function ensureProgress(wordId: number): WordProgress {
    let p = progressMap.value.get(wordId)
    if (!p) {
      p = {
        wordId,
        status: 'new',
        familiarity: 0,
        reps: 0,
        ef: 2.5,
        interval: 0,
        nextReview: 0,
        lastReview: 0,
        totalSeen: 0,
        correctCount: 0,
      }
      progressMap.value.set(wordId, p)
    }
    return p
  }

  function updateProgress(wordId: number, patch: Partial<WordProgress>) {
    const p = ensureProgress(wordId)
    Object.assign(p, patch)
    // 重新 set 以确保响应式触发
    progressMap.value.set(wordId, { ...p })
    persist()
  }

  const statusCounts = computed(() => {
    const c: Record<WordStatus, number> = {
      new: 0,
      unknown: 0,
      vague: 0,
      learning: 0,
      review: 0,
      mastered: 0,
    }
    for (const p of progressMap.value.values()) c[p.status]++
    // new = 总数 - 已记录的
    c.new = words.value.length - (c.unknown + c.vague + c.learning + c.review + c.mastered)
    return c
  })

  // 获取处于指定状态的词 id 列表
  function getIdsByStatus(statuses: WordStatus[]): number[] {
    const result: number[] = []
    for (const w of words.value) {
      const st = progressMap.value.get(w.id)?.status ?? 'new'
      if (statuses.includes(st)) result.push(w.id)
    }
    return result
  }

  // 抽取 N 个词（默认从 new 词中随机抽；不足则全取）
  function pickRandom(ids: number[], count: number): number[] {
    const pool = [...ids]
    // Fisher-Yates 部分打乱
    const n = Math.min(count, pool.length)
    for (let i = 0; i < n; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    return pool.slice(0, n)
  }

  // 获取到期的复习词（learning/review 状态且 nextReview <= now）
  function getDueIds(): number[] {
    const now = Date.now()
    const result: number[] = []
    for (const w of words.value) {
      const p = progressMap.value.get(w.id)
      if (!p) continue
      if ((p.status === 'learning' || p.status === 'review') && p.nextReview <= now) {
        result.push(w.id)
      }
    }
    return result
  }

  function today(): string {
    return new Date().toISOString().slice(0, 10)
  }

  // 记录每日活动
  function recordActivity(type: 'learned' | 'reviewed' | 'flashed' | 'tested', count: number) {
    const d = today()
    if (!daily.value[d]) {
      daily.value[d] = { date: d, learned: 0, reviewed: 0, flashed: 0, tested: 0 }
    }
    daily.value[d][type] += count
    save('daily', daily.value)
  }

  // 记录一次测试结果
  function recordQuiz(r: Omit<QuizResult, 'id' | 'date'>) {
    const result: QuizResult = { id: Date.now(), date: new Date().toISOString(), ...r }
    quizHistory.value = [result, ...quizHistory.value].slice(0, 50)
    save('quizHistory', quizHistory.value)
    recordActivity('tested', r.total)
  }

  // 标记单词已学习，进入复习队列（首次 nextReview 设为现在，立即可复习）
  function markLearned(wordId: number) {
    updateProgress(wordId, {
      status: 'learning',
      reps: 0,
      interval: 0,
      ef: 2.5,
      nextReview: Date.now(),
      lastReview: Date.now(),
    })
    recordActivity('learned', 1)
  }

  // 应用 SM-2 复习结果（q 为质量 0-5）
  function applyReview(wordId: number, q: number) {
    const p = ensureProgress(wordId)
    const patch = sm2(p, q)
    updateProgress(wordId, patch)
    recordActivity('reviewed', 1)
  }

  return {
    words,
    progressMap,
    daily,
    quizHistory,
    statusCounts,
    getWord,
    getProgress,
    ensureProgress,
    updateProgress,
    getIdsByStatus,
    getDueIds,
    markLearned,
    applyReview,
    recordActivity,
    recordQuiz,
    pickRandom,
    persist,
  }
})
