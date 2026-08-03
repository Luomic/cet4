<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useFlashStore } from '@/stores/flash'
import { useWordsStore } from '@/stores/words'
import PieChart from '@/components/PieChart.vue'
import type { Word } from '@/types'

const router = useRouter()
const flash = useFlashStore()
const words = useWordsStore()
const { records, counts, total } = storeToRefs(flash)

// 直接访问或刷新时，从 localStorage 同步恢复最近一次会话（确保首屏有数据）
if (records.value.length === 0) flash.loadLastSession()

// 无记录时引导去闪过
const hasReport = computed(() => records.value.length > 0)

// 重点学习词：不认识 + 模糊，按柯林斯星级降序
const focusWords = computed<(Word & { _judgment: string })[]>(() => {
  const ids = records.value
    .filter((r) => r.judgment !== 'known')
    .map((r) => ({ id: r.wordId, judgment: r.judgment }))
  const list: { word: Word; judgment: string }[] = []
  for (const { id, judgment } of ids) {
    const w = words.getWord(id)
    if (w) list.push({ word: w, judgment })
  }
  list.sort((a, b) => b.word.collins - a.word.collins || a.word.frq - b.word.frq)
  return list.map((x) => ({ ...x.word, _judgment: x.judgment } as Word & { _judgment: string }))
})

const focusCount = computed(() => counts.value.unknown + counts.value.vague)
const knownPct = computed(() => (total.value ? Math.round((counts.value.known / total.value) * 100) : 0))
// 学习计划建议：每日 30 词
const planDays = computed(() => Math.max(1, Math.ceil(focusCount.value / 30)))

function restartUnknown() {
  const ids = words.getIdsByStatus(['unknown', 'vague'])
  const picked = words.pickRandom(ids, 100)
  if (picked.length === 0) {
    alert('没有需要重新闪过的词')
    return
  }
  flash.startSession(picked)
  router.push('/flash')
}

function backToFlash() {
  flash.reset()
  router.push('/flash')
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8">
    <!-- 无记录 -->
    <section
      v-if="!hasReport"
      class="rounded-3xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700"
    >
      <p class="text-slate-500 dark:text-slate-400">还没有闪过记录</p>
      <RouterLink
        to="/flash"
        class="mt-4 inline-block rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white transition hover:bg-brand-700"
      >
        去闪过单词
      </RouterLink>
    </section>

    <template v-else>
      <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">闪过报告</h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        本次共闪过 {{ records.length }} 词
      </p>

      <!-- 概览 + 饼图 -->
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div class="h-56">
            <PieChart
              :labels="['认识', '模糊', '不认识']"
              :data="[counts.known, counts.vague, counts.unknown]"
              :colors="['#10b981', '#f59e0b', '#f43f5e']"
            />
          </div>
        </div>
        <div class="flex flex-col gap-3">
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-900/20">
            <div class="text-sm text-emerald-700 dark:text-emerald-400">已掌握</div>
            <div class="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {{ counts.known }} <span class="text-base font-normal">词 · {{ knownPct }}%</span>
            </div>
          </div>
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-900/20">
            <div class="text-sm text-amber-700 dark:text-amber-400">模糊</div>
            <div class="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{{ counts.vague }} 词</div>
          </div>
          <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-900/50 dark:bg-rose-900/20">
            <div class="text-sm text-rose-700 dark:text-rose-400">不认识</div>
            <div class="mt-1 text-3xl font-bold text-rose-600 dark:text-rose-400">{{ counts.unknown }} 词</div>
          </div>
        </div>
      </div>

      <!-- 学习建议 -->
      <div
        class="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900/50 dark:bg-brand-900/20"
      >
        <div class="font-medium text-brand-800 dark:text-brand-300">学习建议</div>
        <p class="mt-2 text-sm text-brand-700/90 dark:text-brand-300/80">
          你有 <span class="font-semibold">{{ focusCount }}</span> 词需要重点学习。按每日学习 30 词的节奏，约
          <span class="font-semibold">{{ planDays }} 天</span> 可完成。建议优先学习下方高星级（柯林斯）的重点词。
        </p>
      </div>

      <!-- 重点词表 -->
      <div class="mt-6">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-semibold text-slate-900 dark:text-slate-100">
            重点学习词 <span class="text-slate-400">({{ focusWords.length }})</span>
          </h2>
          <span class="text-xs text-slate-400">按词频星级排序</span>
        </div>
        <div class="max-h-96 overflow-y-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table class="w-full text-sm">
            <tbody>
              <tr
                v-for="w in focusWords.slice(0, 60)"
                :key="w.id"
                class="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td class="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">{{ w.word }}</td>
                <td class="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                  <span class="line-clamp-1">{{ w.translation.split('\n')[0] }}</span>
                </td>
                <td class="px-4 py-2.5 text-right">
                  <span
                    v-if="w._judgment === 'unknown'"
                    class="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                    >不认识</span
                  >
                  <span
                    v-else
                    class="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    >模糊</span
                  >
                </td>
                <td class="px-4 py-2.5 text-right text-xs text-amber-500" :title="`柯林斯 ${w.collins} 星`">
                  {{ '★'.repeat(w.collins) || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="focusWords.length > 60" class="mt-2 text-center text-xs text-slate-400">
          仅显示前 60 词，其余可在词库页查看
        </p>
      </div>

      <!-- 入口 -->
      <div class="mt-8 flex flex-wrap gap-3">
        <RouterLink
          to="/learn"
          class="flex-1 rounded-xl bg-brand-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-brand-700"
        >
          开始学习这些词
        </RouterLink>
        <button
          type="button"
          @click="restartUnknown"
          class="flex-1 rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          重新闪过未掌握
        </button>
        <button
          type="button"
          @click="backToFlash"
          class="rounded-xl border border-slate-300 px-5 py-3 text-center font-semibold text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          再来一轮
        </button>
      </div>
    </template>
  </div>
</template>
