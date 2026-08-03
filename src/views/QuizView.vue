<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useWordsStore } from '@/stores/words'
import { useSpeech } from '@/composables/useSpeech'
import type { QuizType, Word } from '@/types'

const words = useWordsStore()
const { speak, supported } = useSpeech()

interface QuizQuestion {
  wordId: number
  kind: QuizType
  prompt: string
  promptSub: string
  options: string[]
  answer: string
}

const typeLabels: Record<QuizType, string> = { 'cn-en': '中→英', 'en-cn': '英→中', spell: '拼写' }

const cfgType = ref<QuizType>('cn-en')
const cfgCount = ref(10)
const cfgScope = ref<'learned' | 'all'>('learned')

const queue = ref<QuizQuestion[]>([])
const index = ref(0)
const active = ref(false)
const finished = ref(false)
const selected = ref<string | null>(null)
const spellInput = ref('')
const spellSubmitted = ref(false)
const correctCount = ref(0)
const wrongList = ref<number[]>([])
const startTime = ref(0)
const endTime = ref(0)

const current = computed(() => queue.value[index.value])
const progressPct = computed(() =>
  queue.value.length ? (index.value / queue.value.length) * 100 : 0,
)
const availableLearned = computed(() =>
  words.getIdsByStatus(['learning', 'review', 'mastered']).length,
)

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(exclude: string, field: 'word' | 'trans'): string[] {
  const set = new Set<string>()
  let guard = 0
  while (set.size < 3 && guard++ < 50) {
    const r = words.words[Math.floor(Math.random() * words.words.length)]
    const v = field === 'word' ? r.word : r.translation.split('\n')[0] || r.word
    if (v && v !== exclude) set.add(v)
  }
  return [...set]
}

function genQuestion(w: Word, kind: QuizType): QuizQuestion {
  const trans = w.translation.split('\n')[0] || ''
  if (kind === 'cn-en') {
    const opts = shuffle([w.word, ...pickDistractors(w.word, 'word')])
    return { wordId: w.id, kind, prompt: trans, promptSub: w.pos, options: opts, answer: w.word }
  }
  if (kind === 'en-cn') {
    const opts = shuffle([trans, ...pickDistractors(trans, 'trans')])
    return { wordId: w.id, kind, prompt: w.word, promptSub: w.phonetic, options: opts, answer: trans }
  }
  return { wordId: w.id, kind, prompt: trans, promptSub: w.phonetic, options: [], answer: w.word }
}

function start() {
  const ids =
    cfgScope.value === 'learned'
      ? words.getIdsByStatus(['learning', 'review', 'mastered'])
      : words.words.map((w) => w.id)
  const picked = words.pickRandom(ids, cfgCount.value)
  if (picked.length === 0) {
    alert('没有符合条件的单词，先去学习一些词再来测试')
    return
  }
  queue.value = picked.map((id) => genQuestion(words.getWord(id)!, cfgType.value))
  index.value = 0
  active.value = true
  finished.value = false
  selected.value = null
  spellInput.value = ''
  spellSubmitted.value = false
  correctCount.value = 0
  wrongList.value = []
  startTime.value = Date.now()
}

function isCorrectNow(): boolean {
  if (!current.value) return false
  if (current.value.kind === 'spell') {
    return spellSubmitted.value && normalize(spellInput.value) === normalize(current.value.answer)
  }
  return selected.value === current.value.answer
}

function answerSelect(opt: string) {
  if (selected.value !== null) return
  selected.value = opt
  if (isCorrectNow()) correctCount.value++
  else wrongList.value.push(current.value.wordId)
  if (current.value.kind === 'cn-en') speak(current.value.answer)
  else speak(words.getWord(current.value.wordId)!.word)
}

function submitSpell() {
  if (spellSubmitted.value) return
  spellSubmitted.value = true
  if (isCorrectNow()) correctCount.value++
  else wrongList.value.push(current.value.wordId)
  speak(current.value.answer)
}

function next() {
  if (index.value >= queue.value.length - 1) {
    endTime.value = Date.now()
    finished.value = true
    const duration = Math.round((endTime.value - startTime.value) / 1000)
    words.recordQuiz({
      type: cfgType.value,
      total: queue.value.length,
      correct: correctCount.value,
      duration,
    })
    return
  }
  index.value++
  selected.value = null
  spellInput.value = ''
  spellSubmitted.value = false
}

function restart() {
  active.value = false
  finished.value = false
}

const durationSec = computed(() => Math.round((endTime.value - startTime.value) / 1000))
const accuracy = computed(() =>
  queue.value.length ? Math.round((correctCount.value / queue.value.length) * 100) : 0,
)
const wrongWords = computed(() =>
  wrongList.value.map((id) => words.getWord(id)).filter(Boolean) as Word[],
)

function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

function optionClass(opt: string): string {
  if (selected.value === null) {
    return 'border-slate-200 bg-white text-slate-800 hover:border-brand-400 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
  }
  if (opt === current.value?.answer) {
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
    <!-- 结果统计 -->
    <section
      v-if="finished"
      class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-center text-2xl font-semibold text-slate-900 dark:text-slate-100">测试完成</h1>
      <div class="mt-6 text-center">
        <div class="text-6xl font-bold" :class="accuracy >= 80 ? 'text-emerald-500' : accuracy >= 60 ? 'text-amber-500' : 'text-rose-500'">
          {{ accuracy }}%
        </div>
        <div class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          答对 {{ correctCount }} / {{ queue.length }} · 用时 {{ fmtTime(durationSec) }}
        </div>
      </div>

      <div v-if="wrongWords.length" class="mt-6">
        <div class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          错题 ({{ wrongWords.length }})
        </div>
        <div class="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-sm">
            <tbody>
              <tr
                v-for="w in wrongWords"
                :key="w.id"
                class="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td class="px-4 py-2 font-medium text-slate-900 dark:text-slate-100">{{ w.word }}</td>
                <td class="px-4 py-2 text-slate-500 dark:text-slate-400">{{ w.translation.split('\n')[0] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          @click="restart"
          class="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700"
        >
          再测一次
        </button>
        <RouterLink
          to="/review"
          class="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          去复习错题
        </RouterLink>
        <RouterLink
          to="/stats"
          class="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          查看统计
        </RouterLink>
      </div>
    </section>

    <!-- 配置面板 -->
    <section
      v-else-if="!active"
      class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">自我测试</h1>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">
        选择题型与数量，检验学习成果。测试结果会记入统计。
      </p>

      <div class="mt-6">
        <div class="text-sm font-medium text-slate-700 dark:text-slate-300">题型</div>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <button
            v-for="(label, key) in typeLabels"
            :key="key"
            type="button"
            @click="cfgType = key"
            :class="[
              'rounded-xl border py-2.5 font-medium transition',
              cfgType === key
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300',
            ]"
          >
            {{ label }}
          </button>
        </div>
      </div>

      <div class="mt-6">
        <div class="text-sm font-medium text-slate-700 dark:text-slate-300">题量</div>
        <div class="mt-2 flex gap-2">
          <button
            v-for="n in [10, 20, 30]"
            :key="n"
            type="button"
            @click="cfgCount = n"
            :class="[
              'flex-1 rounded-xl border py-2.5 font-medium transition',
              cfgCount === n
                ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300',
            ]"
          >
            {{ n }} 题
          </button>
        </div>
      </div>

      <div class="mt-6">
        <div class="text-sm font-medium text-slate-700 dark:text-slate-300">范围</div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            @click="cfgScope = 'learned'"
            :class="[
              'rounded-xl border p-3 text-left transition',
              cfgScope === 'learned'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
            ]"
          >
            <div class="font-medium text-slate-900 dark:text-slate-100">已学过的词</div>
            <div class="mt-0.5 text-xs text-slate-500">{{ availableLearned }} 词可用</div>
          </button>
          <button
            type="button"
            @click="cfgScope = 'all'"
            :class="[
              'rounded-xl border p-3 text-left transition',
              cfgScope === 'all'
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
            ]"
          >
            <div class="font-medium text-slate-900 dark:text-slate-100">全部词库</div>
            <div class="mt-0.5 text-xs text-slate-500">{{ words.words.length }} 词</div>
          </button>
        </div>
      </div>

      <button
        type="button"
        :disabled="cfgScope === 'learned' && availableLearned === 0"
        @click="start"
        class="mt-6 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {{ cfgScope === 'learned' && availableLearned === 0 ? '暂无已学单词，先去学习' : '开始测试' }}
      </button>
    </section>

    <!-- 测试题 -->
    <section v-else-if="current">
      <div class="mb-4">
        <div class="mb-1.5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{{ index + 1 }} / {{ queue.length }}</span>
          <span>{{ typeLabels[current.kind] }}</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div class="h-full rounded-full bg-rose-500 transition-all" :style="{ width: progressPct + '%' }" />
        </div>
      </div>

      <!-- 题干 -->
      <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <div class="text-xs text-slate-400">
          {{ current.kind === 'cn-en' ? '选择对应的英文单词' : current.kind === 'en-cn' ? '选择对应的中文释义' : '拼写英文单词' }}
        </div>
        <div class="mt-2 flex items-baseline gap-2">
          <span
            v-if="current.promptSub && current.kind !== 'spell'"
            class="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            >{{ current.promptSub }}</span
          >
          <span class="text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ current.prompt }}</span>
          <span v-if="current.kind === 'spell' && current.promptSub" class="text-sm text-slate-400">{{ current.promptSub }}</span>
        </div>
      </div>

      <!-- 选择题选项 -->
      <div v-if="current.kind !== 'spell'" class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="opt in current.options"
          :key="opt"
          type="button"
          :disabled="selected !== null"
          @click="answerSelect(opt)"
          :class="['rounded-xl border-2 px-4 py-3 text-left font-medium transition', optionClass(opt)]"
        >
          {{ opt }}
        </button>
      </div>

      <!-- 拼写题输入 -->
      <div v-else class="mt-4">
        <input
          v-model="spellInput"
          type="text"
          :disabled="spellSubmitted"
          autofocus
          placeholder="输入英文单词，回车提交"
          @keydown.enter="submitSpell"
          class="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-lg font-medium text-slate-900 outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          v-if="!spellSubmitted"
          type="button"
          @click="submitSpell"
          class="mt-3 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          提交
        </button>
      </div>

      <!-- 答题反馈 -->
      <div v-if="selected !== null || spellSubmitted" class="mt-4">
        <div
          :class="[
            'rounded-xl p-4',
            isCorrectNow()
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
          ]"
        >
          <div class="font-semibold">{{ isCorrectNow() ? '答对了' : '答错了' }}</div>
          <div class="mt-1 text-sm">
            <span class="font-medium">{{ current.answer }}</span>
            <button
              v-if="supported"
              type="button"
              @click="speak(current.answer)"
              class="ml-2 text-brand-600 hover:underline"
            >
              朗读
            </button>
          </div>
        </div>
        <button
          type="button"
          @click="next"
          class="mt-3 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white shadow transition hover:bg-brand-700"
        >
          {{ index >= queue.length - 1 ? '查看结果' : '下一题' }}
        </button>
      </div>
    </section>
  </div>
</template>
