<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useWordsStore } from '@/stores/words'
import { useSpeech } from '@/composables/useSpeech'
import type { Word } from '@/types'

const words = useWordsStore()
const { speak, supported } = useSpeech()

const queue = ref<number[]>([])
const index = ref(0)
const active = ref(false)
const correctCount = ref(0)
const wrongCount = ref(0)
const selected = ref<string | null>(null)
const options = ref<string[]>([])

const currentWord = computed<Word | undefined>(() =>
  queue.value[index.value] != null ? words.getWord(queue.value[index.value]) : undefined,
)
const finished = computed(() => active.value && index.value >= queue.value.length)
const progressPct = computed(() =>
  queue.value.length ? (index.value / queue.value.length) * 100 : 0,
)
const dueCount = computed(() => words.getDueIds().length)
const translation = computed(() => currentWord.value?.translation.split('\n')[0] || '')
const isCorrect = computed(() => selected.value === currentWord.value?.word)

function start() {
  const ids = words.getDueIds()
  queue.value = words.pickRandom(ids, ids.length)
  index.value = 0
  active.value = true
  correctCount.value = 0
  wrongCount.value = 0
  selected.value = null
  genOptions()
}

function genOptions() {
  const w = currentWord.value
  if (!w) {
    options.value = []
    return
  }
  const correct = w.word
  const distractors = new Set<string>()
  while (distractors.size < 3) {
    const r = words.words[Math.floor(Math.random() * words.words.length)]
    if (r.word !== correct) distractors.add(r.word)
  }
  const opts = [correct, ...distractors]
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[opts[i], opts[j]] = [opts[j], opts[i]]
  }
  options.value = opts
  selected.value = null
}

watch(currentWord, () => {
  if (active.value) genOptions()
})

function answer(opt: string) {
  if (selected.value !== null) return
  selected.value = opt
  const w = currentWord.value
  if (!w) return
  const correct = opt === w.word
  if (correct) {
    correctCount.value++
    speak(w.word)
  } else {
    wrongCount.value++
  }
  // SM-2：答对 q=5，答错 q=2
  words.applyReview(w.id, correct ? 5 : 2)
}

function next() {
  index.value++
}

function restart() {
  active.value = false
}

function optionClass(opt: string): string {
  if (selected.value === null) {
    return 'border-slate-200 bg-white text-slate-800 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
  }
  const correct = currentWord.value?.word
  if (opt === correct) {
    return 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
  }
  if (opt === selected.value) {
    return 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  }
  return 'border-slate-200 bg-white opacity-50 dark:border-slate-700 dark:bg-slate-900'
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-8">
    <!-- 完成统计 -->
    <section
      v-if="finished"
      class="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">复习完成</h1>
      <div class="mt-6 grid grid-cols-2 gap-4">
        <div class="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-900/20">
          <div class="text-sm text-emerald-700 dark:text-emerald-400">答对</div>
          <div class="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{{ correctCount }}</div>
        </div>
        <div class="rounded-2xl bg-rose-50 p-5 dark:bg-rose-900/20">
          <div class="text-sm text-rose-700 dark:text-rose-400">答错</div>
          <div class="mt-1 text-3xl font-bold text-rose-600 dark:text-rose-400">{{ wrongCount }}</div>
        </div>
      </div>
      <p class="mt-6 text-sm text-slate-500 dark:text-slate-400">
        答错的词将在明天再次出现，答对的词按记忆曲线延后复习
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <button
          type="button"
          @click="restart"
          class="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          查看其他
        </button>
        <RouterLink
          to="/"
          class="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700"
        >
          返回首页
        </RouterLink>
      </div>
    </section>

    <!-- 配置面板 -->
    <section
      v-else-if="!active"
      class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">间隔复习</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        基于 SM-2 遗忘曲线，复习到期单词。四选一作答，答对延后，答错近期重练。
      </p>

      <div class="mt-6 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800/60">
        <span class="text-slate-500 dark:text-slate-400">今日待复习</span>
        <span class="font-semibold text-slate-900 dark:text-slate-100">{{ dueCount }} 词</span>
      </div>

      <button
        type="button"
        :disabled="dueCount === 0"
        @click="start"
        class="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ dueCount === 0 ? '暂无待复习词' : `开始复习（${dueCount} 词）` }}
      </button>
      <p v-if="dueCount === 0" class="mt-3 text-center text-xs text-slate-400">
        先去学习新词，或稍后再来复习
      </p>
    </section>

    <!-- 测试题 -->
    <section v-else-if="currentWord">
      <div class="mb-4">
        <div class="mb-1.5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{{ index + 1 }} / {{ queue.length }}</span>
          <span>{{ Math.round(progressPct) }}%</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full rounded-full bg-sky-500 transition-all" :style="{ width: progressPct + '%' }" />
        </div>
      </div>

      <!-- 题目：中文释义 -->
      <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div class="text-xs text-slate-400">选择对应的英文单词</div>
        <div class="mt-2 flex items-baseline gap-2">
          <span
            v-if="currentWord.pos"
            class="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            >{{ currentWord.pos }}</span
          >
          <span class="text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ translation }}</span>
        </div>
      </div>

      <!-- 选项 -->
      <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="opt in options"
          :key="opt"
          type="button"
          :disabled="selected !== null"
          @click="answer(opt)"
          :class="[
            'rounded-xl border-2 px-4 py-3 text-left font-medium transition',
            optionClass(opt),
          ]"
        >
          {{ opt }}
        </button>
      </div>

      <!-- 答题反馈 -->
      <div v-if="selected !== null" class="mt-4">
        <div
          :class="[
            'rounded-xl p-4',
            isCorrect
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
          ]"
        >
          <div class="font-semibold">{{ isCorrect ? '答对了' : '答错了' }}</div>
          <div class="mt-1 text-sm">
            <span class="font-medium">{{ currentWord.word }}</span>
            <span v-if="currentWord.phonetic" class="ml-2 text-slate-500">{{ currentWord.phonetic }}</span>
            <button
              v-if="supported"
              type="button"
              @click="speak(currentWord.word)"
              class="ml-2 text-brand-600 hover:underline"
            >
              朗读
            </button>
          </div>
          <div class="mt-1 whitespace-pre-line text-xs text-slate-500 dark:text-slate-400">
            {{ currentWord.translation }}
          </div>
        </div>
        <button
          type="button"
          @click="next"
          class="mt-3 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow transition hover:bg-brand-700"
        >
          下一题
        </button>
      </div>
    </section>
  </div>
</template>
