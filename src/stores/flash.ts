import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FlashJudgment, FlashRecord, WordStatus } from '@/types'
import { useWordsStore } from './words'
import { load, save } from '@/utils/storage'

// 判定 → 状态/熟悉度映射
const JUDGE_MAP: Record<FlashJudgment, { status: WordStatus; familiarity: number }> = {
  known: { status: 'mastered', familiarity: 5 },
  vague: { status: 'vague', familiarity: 2 },
  unknown: { status: 'unknown', familiarity: 0 },
}

const SESSION_KEY = 'lastFlashSession'

interface PersistedSession {
  records: FlashRecord[]
  sessionIds: number[]
  timestamp: number
}

export const useFlashStore = defineStore('flash', () => {
  const wordsStore = useWordsStore()

  const sessionIds = ref<number[]>([])
  const currentIndex = ref(0)
  const records = ref<FlashRecord[]>([])
  const active = ref(false)

  const currentId = computed(() => sessionIds.value[currentIndex.value] ?? -1)
  const currentWord = computed(() => wordsStore.getWord(currentId.value))
  const total = computed(() => sessionIds.value.length)
  const finished = computed(() => active.value && currentIndex.value >= total.value && total.value > 0)
  const progressPct = computed(() => (total.value ? (currentIndex.value / total.value) * 100 : 0))

  const counts = computed(() => {
    const c = { known: 0, vague: 0, unknown: 0 }
    for (const r of records.value) c[r.judgment]++
    return c
  })

  function persistSession() {
    const data: PersistedSession = {
      records: records.value,
      sessionIds: sessionIds.value,
      timestamp: Date.now(),
    }
    save(SESSION_KEY, data)
  }

  function startSession(ids: number[]) {
    sessionIds.value = ids
    currentIndex.value = 0
    records.value = []
    active.value = true
    persistSession()
  }

  function judge(j: FlashJudgment) {
    const wordId = currentId.value
    if (wordId < 0) return
    records.value.push({ wordId, judgment: j, timestamp: Date.now() })
    const map = JUDGE_MAP[j]
    const prev = wordsStore.getProgress(wordId)
    wordsStore.updateProgress(wordId, {
      status: map.status,
      familiarity: map.familiarity,
      totalSeen: (prev?.totalSeen ?? 0) + 1,
      lastReview: Date.now(),
    })
    wordsStore.recordActivity('flashed', 1)
    persistSession()
  }

  function next() {
    currentIndex.value++
  }

  function reset() {
    sessionIds.value = []
    currentIndex.value = 0
    records.value = []
    active.value = false
  }

  // 从 localStorage 恢复最近一次会话（用于报告页刷新或直接访问）
  function loadLastSession() {
    const data = load<PersistedSession | null>(SESSION_KEY, null)
    if (data && data.records?.length) {
      records.value = data.records
      sessionIds.value = data.sessionIds
    }
  }

  return {
    sessionIds,
    currentIndex,
    records,
    active,
    currentId,
    currentWord,
    total,
    finished,
    progressPct,
    counts,
    startSession,
    judge,
    next,
    reset,
    loadLastSession,
  }
})
