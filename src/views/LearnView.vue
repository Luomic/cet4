<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useWordsStore } from '@/stores/words'
import { useSpeech } from '@/composables/useSpeech'
import type { Word } from '@/types'

const words = useWordsStore()
const { statusCounts } = storeToRefs(words)
const { speak, supported } = useSpeech()

const BATCH = 20

const queue = ref<number[]>([])
const index = ref(0)
const active = ref(false)
const learnedCount = ref(0)
const skippedCount = ref(0)

const currentWord = computed<Word | undefined>(() =>
  queue.value[index.value] != null ? words.getWord(queue.value[index.value]) : undefined,
)
const finished = computed(() => active.value && index.value >= queue.value.length)
const progressPct = computed(() =>
  queue.value.length ? (index.value / queue.value.length) * 100 : 0,
)
const available = computed(() => statusCounts.value.unknown + statusCounts.value.vague)

function start() {
  const ids = words.getIdsByStatus(['unknown', 'vague'])
  queue.value = words.pickRandom(ids, BATCH)
  index.value = 0
  active.value = true
  learnedCount.value = 0
  skippedCount.value = 0
}

function learned() {
  if (!currentWord.value) return
  words.markLearned(currentWord.value.id)
  learnedCount.value++
  index.value++
}

function skip() {
  skippedCount.value++
  index.value++
}

function restart() {
  active.value = false
}

// 进入新词自动朗读
watch(currentWord, (w) => {
  if (w && active.value) speak(w.word)
})

function onKey(e: KeyboardEvent) {
  if (!active.value || finished.value) return
  if (e.code === 'ArrowLeft') skip()
  else if (e.code === 'ArrowRight') learned()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <!-- 完成统计 -->
    <section
      v-if="finished"
      class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-accent-500/10 text-accent-600">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">本批学习完成</h1>
      <p class="mt-2 text-slate-500 dark:text-slate-400">
        学会 {{ learnedCount }} 词 · 待巩固 {{ skippedCount }} 词
      </p>
      <p class="mt-1 text-sm text-slate-400">
        学会的词已进入复习队列，去复习页巩固记忆
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <RouterLink
          to="/review"
          class="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700"
        >
          去复习
        </RouterLink>
        <button
          type="button"
          @click="restart"
          class="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          再学一批
        </button>
      </div>
    </section>

    <!-- 配置面板 -->
    <section
      v-else-if="!active"
      class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">学习新词</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        学习闪过时判定为"不认识/模糊"的生词。看懂卡片后点"学会了"，该词进入间隔复习队列。
      </p>

      <div class="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400">待学生词</span>
        <span class="font-semibold text-slate-900 dark:text-slate-100">{{ available }} 词</span>
      </div>

      <button
        type="button"
        :disabled="available === 0"
        @click="start"
        class="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ available === 0 ? '暂无生词，先去闪过筛选' : `开始学习（每批 ${BATCH} 词）` }}
      </button>
      <p class="mt-3 text-center text-xs text-slate-400">→ 学会 · ← 跳过（待巩固）</p>
    </section>

    <!-- 学习卡片 -->
    <section v-else-if="currentWord">
      <div class="mb-4">
        <div class="mb-1.5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{{ index + 1 }} / {{ queue.length }}</span>
          <span>{{ Math.round(progressPct) }}%</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full rounded-full bg-accent-500 transition-all" :style="{ width: progressPct + '%' }" />
        </div>
      </div>

      <div
        class="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <div class="flex items-baseline gap-3">
          <span class="text-3xl font-bold text-slate-900 dark:text-slate-100">{{ currentWord.word }}</span>
          <span v-if="currentWord.phonetic" class="text-sm text-slate-400">{{ currentWord.phonetic }}</span>
          <span
            v-if="currentWord.pos"
            class="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            >{{ currentWord.pos }}</span
          >
          <button
            v-if="supported"
            type="button"
            @click="speak(currentWord.word)"
            class="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
            title="朗读"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
        </div>

        <div class="mt-4 whitespace-pre-line text-slate-700 dark:text-slate-300">
          {{ currentWord.translation }}
        </div>

        <div v-if="currentWord.example" class="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <div class="text-sm leading-relaxed text-slate-800 dark:text-slate-200">{{ currentWord.example }}</div>
          <div v-if="currentWord.exampleTrans" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ currentWord.exampleTrans }}
          </div>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="skip"
          class="rounded-xl border-2 border-slate-200 py-3 font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          还没掌握 <span class="text-xs font-normal text-slate-400">←</span>
        </button>
        <button
          type="button"
          @click="learned"
          class="rounded-xl bg-accent-500 py-3 font-semibold text-white shadow transition hover:bg-accent-600"
        >
          学会了 <span class="text-xs font-normal opacity-80">→</span>
        </button>
      </div>
    </section>
  </div>
</template>
