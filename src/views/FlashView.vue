<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFlashStore } from '@/stores/flash'
import { useWordsStore } from '@/stores/words'
import FlashCard from '@/components/FlashCard.vue'
import type { FlashJudgment, WordStatus } from '@/types'

const router = useRouter()
const flash = useFlashStore()
const words = useWordsStore()
const { active, finished, currentWord, total, currentIndex, progressPct } = storeToRefs(flash)

// 会话配置
const count = ref(100)
const scope = ref<'unjudged' | 'unknown'>('unjudged')

const flipped = ref(false)

function availableCount(): number {
  const statuses: WordStatus[] =
    scope.value === 'unjudged' ? ['new', 'unknown', 'vague'] : ['unknown', 'vague']
  return words.getIdsByStatus(statuses).length
}

function start() {
  const statuses: WordStatus[] =
    scope.value === 'unjudged' ? ['new', 'unknown', 'vague'] : ['unknown', 'vague']
  const ids = words.getIdsByStatus(statuses)
  const picked = words.pickRandom(ids, count.value)
  if (picked.length === 0) {
    alert('没有符合条件的单词可供闪过，换个范围试试')
    return
  }
  flash.startSession(picked)
  flipped.value = false
}

function judge(j: FlashJudgment) {
  flash.judge(j)
  flipped.value = false
  flash.next()
}

function flip() {
  flipped.value = !flipped.value
}

// 键盘控制：空格翻转，←/1 不认识，↑/2 模糊，→/3 认识
function onKey(e: KeyboardEvent) {
  if (!active.value || finished.value) return
  if (e.code === 'Space') {
    e.preventDefault()
    flip()
  } else if (e.code === 'ArrowLeft' || e.key === '1') {
    judge('unknown')
  } else if (e.code === 'ArrowUp' || e.key === '2') {
    judge('vague')
  } else if (e.code === 'ArrowRight' || e.key === '3') {
    judge('known')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

// 完成后跳转报告
watch(finished, (f) => {
  if (f) router.push('/flash/report')
})
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <!-- 配置面板 -->
    <section
      v-if="!active"
      class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">闪过单词</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        快速浏览单词，三选一判定掌握程度。系统会据此筛选出真正需要学习的词汇，避免在已掌握的词上浪费时间。
      </p>

      <div class="mt-8">
        <div class="text-sm font-medium text-slate-700 dark:text-slate-300">闪过范围</div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="scope = 'unjudged'"
            :class="[
              'rounded-xl border p-3 text-left transition',
              scope === 'unjudged'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
            ]"
          >
            <div class="font-medium text-slate-900 dark:text-slate-100">新词与未掌握</div>
            <div class="mt-0.5 text-xs text-slate-500">所有尚未判定为掌握的词</div>
          </button>
          <button
            type="button"
            @click="scope = 'unknown'"
            :class="[
              'rounded-xl border p-3 text-left transition',
              scope === 'unknown'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
            ]"
          >
            <div class="font-medium text-slate-900 dark:text-slate-100">仅不认识/模糊</div>
            <div class="mt-0.5 text-xs text-slate-500">二次闪过，进一步缩小范围</div>
          </button>
        </div>
      </div>

      <div class="mt-6">
        <div class="text-sm font-medium text-slate-700 dark:text-slate-300">本次数量</div>
        <div class="mt-2 flex gap-2">
          <button
            v-for="n in [50, 100, 200]"
            :key="n"
            type="button"
            @click="count = n"
            :class="[
              'flex-1 rounded-xl border py-2.5 font-medium transition',
              count === n
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300',
            ]"
          >
            {{ n }} 词
          </button>
        </div>
      </div>

      <div class="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400">当前范围可闪过</span>
        <span class="font-semibold text-slate-900 dark:text-slate-100">{{ availableCount() }} 词</span>
      </div>

      <button
        type="button"
        :disabled="availableCount() === 0"
        @click="start"
        class="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        开始闪过
      </button>
    </section>

    <!-- 卡片流 -->
    <section v-else-if="!finished && currentWord">
      <!-- 进度条 -->
      <div class="mb-4">
        <div class="mb-1.5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{{ currentIndex + 1 }} / {{ total }}</span>
          <span>{{ Math.round(progressPct) }}%</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full rounded-full bg-brand-500 transition-all" :style="{ width: progressPct + '%' }" />
        </div>
      </div>

      <FlashCard :word="currentWord" :flipped="flipped" @flip="flip" />

      <!-- 三选一判定 -->
      <div class="mt-5 grid grid-cols-3 gap-2">
        <button
          type="button"
          @click="judge('unknown')"
          class="group rounded-xl border-2 border-rose-200 bg-rose-50 py-3 text-center transition hover:border-rose-400 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-900/20"
        >
          <div class="font-semibold text-rose-600 dark:text-rose-400">不认识</div>
          <div class="mt-0.5 text-xs text-rose-400/80">← / 1</div>
        </button>
        <button
          type="button"
          @click="judge('vague')"
          class="group rounded-xl border-2 border-amber-200 bg-amber-50 py-3 text-center transition hover:border-amber-400 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-900/20"
        >
          <div class="font-semibold text-amber-600 dark:text-amber-400">模糊</div>
          <div class="mt-0.5 text-xs text-amber-500/80">↑ / 2</div>
        </button>
        <button
          type="button"
          @click="judge('known')"
          class="group rounded-xl border-2 border-emerald-200 bg-emerald-50 py-3 text-center transition hover:border-emerald-400 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-900/20"
        >
          <div class="font-semibold text-emerald-600 dark:text-emerald-400">认识</div>
          <div class="mt-0.5 text-xs text-emerald-500/80">→ / 3</div>
        </button>
      </div>
      <p class="mt-3 text-center text-xs text-slate-400">
        空格翻转卡片 · 方向键或数字键快速判定
      </p>
    </section>
  </div>
</template>
