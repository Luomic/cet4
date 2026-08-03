<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useWordsStore } from '@/stores/words'
import PieChart from '@/components/PieChart.vue'
import BarChart from '@/components/BarChart.vue'
import LineChart from '@/components/LineChart.vue'
import type { QuizType } from '@/types'

const words = useWordsStore()

const typeLabels: Record<QuizType, string> = { 'cn-en': '中→英', 'en-cn': '英→中', spell: '拼写' }

// ===== 核心指标 =====
const total = computed(() => words.words.length)
const masteredPct = computed(() =>
  total.value ? Math.round((words.statusCounts.mastered / total.value) * 100) : 0,
)
const learnedTotal = computed(
  () => words.statusCounts.learning + words.statusCounts.review + words.statusCounts.mastered,
)
const reviewDue = computed(() => words.getDueIds().length)

// ===== 连续打卡天数 =====
function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}
function hasActivity(d: string): boolean {
  const r = words.daily[d]
  return !!r && (r.learned + r.reviewed + r.flashed + r.tested) > 0
}
const streak = computed(() => {
  let s = 0
  const cur = new Date()
  // 若今天无活动，从昨天起算（允许今天还没开始学）
  if (!hasActivity(dateStr(cur))) cur.setDate(cur.getDate() - 1)
  while (hasActivity(dateStr(cur))) {
    s++
    cur.setDate(cur.getDate() - 1)
  }
  return s
})

// ===== 状态分布饼图 =====
const statusLabels = ['未接触', '不认识', '模糊', '学习中', '复习中', '已掌握']
const statusColors = ['#cbd5e1', '#f43f5e', '#f59e0b', '#6366f1', '#8b5cf6', '#10b981']
const statusData = computed(() => [
  words.statusCounts.new,
  words.statusCounts.unknown,
  words.statusCounts.vague,
  words.statusCounts.learning,
  words.statusCounts.review,
  words.statusCounts.mastered,
])

// ===== 柯林斯星级分布柱状图（含已掌握占比）=====
const collinsBuckets = computed(() => {
  const buckets = [
    { label: '0 星', total: 0, mastered: 0 },
    { label: '1 星', total: 0, mastered: 0 },
    { label: '2 星', total: 0, mastered: 0 },
    { label: '3 星', total: 0, mastered: 0 },
    { label: '4 星', total: 0, mastered: 0 },
    { label: '5 星', total: 0, mastered: 0 },
  ]
  for (const w of words.words) {
    const idx = Math.min(Math.max(w.collins, 0), 5)
    buckets[idx].total++
    if (words.getProgress(w.id)?.status === 'mastered') buckets[idx].mastered++
  }
  return buckets
})
const collinsLabels = computed(() => collinsBuckets.value.map((b) => b.label))
const collinsTotal = computed(() => collinsBuckets.value.map((b) => b.total))
const collinsColors = computed(() =>
  collinsBuckets.value.map((b) =>
    b.total === 0 ? '#cbd5e1' : b.mastered / b.total >= 0.8 ? '#10b981' : '#6366f1',
  ),
)

// ===== 最近 14 天活动趋势 =====
const trendDays = 14
const trend = computed(() => {
  const labels: string[] = []
  const learned: number[] = []
  const reviewed: number[] = []
  const tested: number[] = []
  const today = new Date()
  for (let i = trendDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = dateStr(d)
    const r = words.daily[key]
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
    learned.push(r?.learned ?? 0)
    reviewed.push(r?.reviewed ?? 0)
    tested.push(r?.tested ?? 0)
  }
  return { labels, learned, reviewed, tested }
})
// 学习+复习合计趋势（折线图单数据集）
const trendCombined = computed(() =>
  trend.value.learned.map((v, i) => v + trend.value.reviewed[i] + trend.value.tested[i]),
)

// ===== 打卡日历热力图（最近 12 周 = 84 天）=====
const calendarWeeks = 12
interface CalCell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
}
const calendar = computed<CalCell[][]>(() => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = calendarWeeks * 7
  // 让日历从周日开始对齐：找到最早日期
  const start = new Date(today)
  start.setDate(start.getDate() - (totalDays - 1))
  // 对齐到周首（周日）
  start.setDate(start.getDate() - start.getDay())

  const weeks: CalCell[][] = []
  const cur = new Date(start)
  while (cur <= today) {
    const week: CalCell[] = []
    for (let i = 0; i < 7; i++) {
      const key = dateStr(cur)
      const r = words.daily[key]
      const count = r ? r.learned + r.reviewed + r.flashed + r.tested : 0
      let level: 0 | 1 | 2 | 3 | 4 = 0
      if (count >= 1) level = 1
      if (count >= 10) level = 2
      if (count >= 30) level = 3
      if (count >= 60) level = 4
      week.push({
        date: key,
        count,
        level,
        future: cur > today,
      })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
})
const calMonthLabels = computed(() => {
  return calendar.value.map((week) => {
    const first = week[0]
    const d = new Date(first.date)
    return `${d.getMonth() + 1}月`
  })
})
function calCellClass(level: number, future: boolean): string {
  if (future) return 'bg-slate-50 dark:bg-slate-900/40'
  const map: Record<number, string> = {
    0: 'bg-slate-100 dark:bg-slate-800',
    1: 'bg-brand-200 dark:bg-brand-900/50',
    2: 'bg-brand-400 dark:bg-brand-700',
    3: 'bg-brand-600 dark:bg-brand-500',
    4: 'bg-brand-800 dark:bg-brand-400',
  }
  return map[level] ?? map[0]
}

// ===== 测试历史 =====
const recentQuizzes = computed(() => words.quizHistory.slice(0, 10))
function fmtDate(iso: string): string {
  const d = new Date(iso)
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const h = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}
function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
function accPct(q: { correct: number; total: number }): number {
  return q.total ? Math.round((q.correct / q.total) * 100) : 0
}
function accClass(pct: number): string {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-rose-600 dark:text-rose-400'
}

// 总测试统计
const quizSummary = computed(() => {
  const list = words.quizHistory
  if (list.length === 0) return null
  const totalQ = list.reduce((s, q) => s + q.total, 0)
  const totalCorrect = list.reduce((s, q) => s + q.correct, 0)
  const avgAcc = totalQ ? Math.round((totalCorrect / totalQ) * 100) : 0
  return { count: list.length, avgAcc, totalQ, totalCorrect }
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">学习统计</h1>
    <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">追踪你的学习进度、记忆曲线与测试表现。</p>

    <!-- 核心指标 -->
    <div class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="text-xs text-slate-500 dark:text-slate-400">词库总量</div>
        <div class="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{{ total }}</div>
      </div>
      <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-900/20">
        <div class="text-xs text-emerald-700 dark:text-emerald-400">已掌握</div>
        <div class="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {{ words.statusCounts.mastered }}
          <span class="text-sm font-normal">· {{ masteredPct }}%</span>
        </div>
      </div>
      <div class="rounded-2xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/50 dark:bg-brand-900/20">
        <div class="text-xs text-brand-700 dark:text-brand-400">学习中 / 待复习</div>
        <div class="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">
          {{ learnedTotal }}
          <span class="text-sm font-normal" v-if="reviewDue">· {{ reviewDue }} 到期</span>
        </div>
      </div>
      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
        <div class="text-xs text-amber-700 dark:text-amber-400">连续打卡</div>
        <div class="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
          {{ streak }} <span class="text-sm font-normal">天</span>
        </div>
      </div>
    </div>

    <!-- 状态分布 + 星级分布 -->
    <div class="mt-6 grid gap-4 lg:grid-cols-2">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">状态分布</h2>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">全部词库当前的学习状态</p>
        <div class="mt-4 h-64">
          <PieChart :labels="statusLabels" :data="statusData" :colors="statusColors" />
        </div>
      </div>
      <div class="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">柯林斯星级分布</h2>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          各星级词数 · 绿色表示该星级掌握率 ≥ 80%
        </p>
        <div class="mt-4 h-64">
          <BarChart :labels="collinsLabels" :data="collinsTotal" :colors="collinsColors" />
        </div>
        <div class="mt-3 grid grid-cols-6 gap-1 text-center text-xs text-slate-500 dark:text-slate-400">
          <div v-for="(b, i) in collinsBuckets" :key="i">
            <div class="font-medium text-slate-700 dark:text-slate-300">{{ b.mastered }}</div>
            <div>/ {{ b.total }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 掌握趋势 -->
    <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="font-semibold text-slate-900 dark:text-slate-100">最近 14 天活动</h2>
      <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">每日学习 + 复习 + 测试 合计</p>
      <div class="mt-4 h-56">
        <LineChart :labels="trend.labels" :data="trendCombined" color="#6366f1" />
      </div>
      <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div class="rounded-lg bg-brand-50 py-2 dark:bg-brand-900/20">
          <div class="text-slate-500 dark:text-slate-400">学习</div>
          <div class="mt-0.5 font-semibold text-brand-600 dark:text-brand-400">
            {{ trend.learned.reduce((a, b) => a + b, 0) }}
          </div>
        </div>
        <div class="rounded-lg bg-violet-50 py-2 dark:bg-violet-900/20">
          <div class="text-slate-500 dark:text-slate-400">复习</div>
          <div class="mt-0.5 font-semibold text-violet-600 dark:text-violet-400">
            {{ trend.reviewed.reduce((a, b) => a + b, 0) }}
          </div>
        </div>
        <div class="rounded-lg bg-rose-50 py-2 dark:bg-rose-900/20">
          <div class="text-slate-500 dark:text-slate-400">测试</div>
          <div class="mt-0.5 font-semibold text-rose-600 dark:text-rose-400">
            {{ trend.tested.reduce((a, b) => a + b, 0) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 打卡日历 -->
    <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">打卡日历</h2>
        <div class="flex items-center gap-1 text-xs text-slate-400">
          <span>少</span>
          <span class="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800"></span>
          <span class="h-3 w-3 rounded-sm bg-brand-200 dark:bg-brand-900/50"></span>
          <span class="h-3 w-3 rounded-sm bg-brand-400 dark:bg-brand-700"></span>
          <span class="h-3 w-3 rounded-sm bg-brand-600 dark:bg-brand-500"></span>
          <span class="h-3 w-3 rounded-sm bg-brand-800 dark:bg-brand-400"></span>
          <span>多</span>
        </div>
      </div>
      <div class="mt-4 overflow-x-auto">
        <div class="flex gap-1" style="min-width: 360px">
          <div class="flex flex-col justify-between pr-1 text-[10px] text-slate-400" style="height: 84px">
            <span>一</span>
            <span>三</span>
            <span>五</span>
            <span>日</span>
          </div>
          <div class="flex flex-1 gap-1">
            <div v-for="(week, wi) in calendar" :key="wi" class="flex flex-1 flex-col gap-1">
              <div
                v-for="(cell, ci) in week"
                :key="ci"
                :class="['h-3 w-full rounded-sm transition', calCellClass(cell.level, cell.future)]"
                :title="`${cell.date} · ${cell.count} 次活动`"
              ></div>
            </div>
          </div>
        </div>
        <div class="mt-2 flex gap-1 pl-5 text-[10px] text-slate-400">
          <div v-for="(m, i) in calMonthLabels" :key="i" class="flex-1 text-center">{{ m }}</div>
        </div>
      </div>
    </div>

    <!-- 测试历史 -->
    <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-slate-900 dark:text-slate-100">测试历史</h2>
        <RouterLink
          v-if="quizSummary"
          to="/quiz"
          class="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          去测试 →
        </RouterLink>
      </div>

      <div v-if="!quizSummary" class="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
        <p class="text-sm text-slate-500 dark:text-slate-400">还没有测试记录</p>
        <RouterLink
          to="/quiz"
          class="mt-3 inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          开始第一次测试
        </RouterLink>
      </div>

      <template v-else>
        <!-- 测试汇总 -->
        <div class="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div class="rounded-lg bg-slate-50 py-3 dark:bg-slate-800/50">
            <div class="text-xs text-slate-500 dark:text-slate-400">累计测试</div>
            <div class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{{ quizSummary.count }}</div>
          </div>
          <div class="rounded-lg bg-slate-50 py-3 dark:bg-slate-800/50">
            <div class="text-xs text-slate-500 dark:text-slate-400">累计题数</div>
            <div class="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{{ quizSummary.totalQ }}</div>
          </div>
          <div class="rounded-lg bg-slate-50 py-3 dark:bg-slate-800/50">
            <div class="text-xs text-slate-500 dark:text-slate-400">平均正确率</div>
            <div class="mt-1 text-xl font-bold" :class="accClass(quizSummary.avgAcc)">{{ quizSummary.avgAcc }}%</div>
          </div>
        </div>

        <!-- 测试列表 -->
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th class="py-2 pr-3 font-medium">时间</th>
                <th class="py-2 pr-3 font-medium">题型</th>
                <th class="py-2 pr-3 font-medium">正确率</th>
                <th class="py-2 pr-3 font-medium">正确 / 总数</th>
                <th class="py-2 font-medium">用时</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="q in recentQuizzes"
                :key="q.id"
                class="border-b border-slate-100 last:border-0 dark:border-slate-800"
              >
                <td class="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{{ fmtDate(q.date) }}</td>
                <td class="py-2.5 pr-3">
                  <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {{ typeLabels[q.type] }}
                  </span>
                </td>
                <td class="py-2.5 pr-3 font-semibold" :class="accClass(accPct(q))">{{ accPct(q) }}%</td>
                <td class="py-2.5 pr-3 text-slate-600 dark:text-slate-300">{{ q.correct }} / {{ q.total }}</td>
                <td class="py-2.5 text-slate-500 dark:text-slate-400">{{ fmtDuration(q.duration) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
