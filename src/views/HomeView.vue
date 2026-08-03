<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useWordsStore } from '@/stores/words'

const words = useWordsStore()
const { statusCounts } = storeToRefs(words)

const toLearn = computed(() => statusCounts.value.unknown + statusCounts.value.vague)
const toReview = computed(() => words.getDueIds().length)
const mastered = computed(() => statusCounts.value.mastered)
const total = computed(() => words.words.length)
const masteredPct = computed(() => Math.round((mastered.value / total.value) * 100))

const entries = [
  { to: '/flash', title: '闪过单词', desc: '快速浏览，智能筛选需要掌握的词汇', color: 'from-brand-500 to-brand-600' },
  { to: '/learn', title: '学习新词', desc: '卡片式学习，含释义、例句与发音', color: 'from-accent-500 to-accent-600' },
  { to: '/review', title: '间隔复习', desc: '基于遗忘曲线的智能复习安排', color: 'from-sky-500 to-sky-600' },
  { to: '/quiz', title: '自我测试', desc: '中英互译与拼写测试，检验成果', color: 'from-rose-500 to-rose-600' },
]
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <section class="rounded-3xl bg-gradient-to-br from-brand-600 via-brand-500 to-accent-500 p-8 text-white shadow-lg sm:p-12">
      <h1 class="text-3xl font-bold sm:text-4xl">CET4 词汇</h1>
      <p class="mt-3 max-w-xl text-brand-50/90">
        用科学的方法背诵四级单词。先闪过筛选已掌握的词，再针对生词学习与复习，节省时间。
      </p>
      <div class="mt-6 flex flex-wrap gap-3">
        <RouterLink
          to="/flash"
          class="rounded-xl bg-white px-5 py-2.5 font-semibold text-brand-700 shadow transition hover:bg-brand-50"
        >
          开始闪过
        </RouterLink>
        <RouterLink
          v-if="toReview > 0"
          to="/review"
          class="rounded-xl bg-white/15 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/25"
        >
          今日复习 ({{ toReview }})
        </RouterLink>
        <RouterLink
          v-else
          to="/learn"
          class="rounded-xl bg-white/15 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/25"
        >
          学习新词
        </RouterLink>
      </div>
    </section>

    <!-- 今日任务概览 -->
    <section class="mt-6 grid gap-4 sm:grid-cols-3">
      <RouterLink
        to="/learn"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="text-sm text-slate-500 dark:text-slate-400">待学习</div>
        <div class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{{ toLearn }}</div>
        <div class="mt-1 text-xs text-slate-400">不认识 + 模糊的词</div>
      </RouterLink>
      <RouterLink
        to="/review"
        class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="text-sm text-slate-500 dark:text-slate-400">今日待复习</div>
        <div class="mt-1 text-3xl font-bold text-sky-600 dark:text-sky-400">{{ toReview }}</div>
        <div class="mt-1 text-xs text-slate-400">SM-2 到期单词</div>
      </RouterLink>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="text-sm text-slate-500 dark:text-slate-400">已掌握</div>
        <div class="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ mastered }} <span class="text-base font-normal text-slate-400">/ {{ total }}</span>
        </div>
        <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div class="h-full rounded-full bg-emerald-500" :style="{ width: masteredPct + '%' }" />
        </div>
        <div class="mt-1 text-xs text-slate-400">{{ masteredPct }}%</div>
      </div>
    </section>

    <section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <RouterLink
        v-for="e in entries"
        :key="e.to"
        :to="e.to"
        class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        <div :class="['mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white', e.color]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
        <h3 class="font-semibold text-slate-900 dark:text-slate-100">{{ e.title }}</h3>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ e.desc }}</p>
      </RouterLink>
    </section>
  </div>
</template>
