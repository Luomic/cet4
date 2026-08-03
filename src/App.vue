<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { ref, onMounted } from 'vue'

const navItems = [
  { to: '/flash', label: '闪过' },
  { to: '/learn', label: '学习' },
  { to: '/review', label: '复习' },
  { to: '/quiz', label: '测试' },
  { to: '/wordbook', label: '词库' },
  { to: '/stats', label: '统计' },
]

const dark = ref(false)

function applyDark() {
  document.documentElement.classList.toggle('dark', dark.value)
}

function toggleDark() {
  dark.value = !dark.value
  localStorage.setItem('cet4-dark', String(dark.value))
  applyDark()
}

onMounted(() => {
  const saved = localStorage.getItem('cet4-dark')
  dark.value = saved ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches
  applyDark()
})
</script>

<template>
  <div class="min-h-full bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
    <header
      class="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div class="mx-auto flex h-14 max-w-6xl items-center gap-1 px-4">
        <RouterLink
          to="/"
          class="mr-3 flex items-center gap-2 font-semibold text-brand-600 dark:text-brand-400"
        >
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs text-white"
            >C4</span
          >
          <span class="hidden sm:inline">CET4 词汇</span>
        </RouterLink>

        <nav class="flex items-center gap-1 overflow-x-auto">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            active-class="bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="ml-auto flex items-center gap-1">
          <RouterLink
            to="/settings"
            class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="设置"
            active-class="bg-slate-100 dark:bg-slate-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
              />
            </svg>
          </RouterLink>
          <button
            type="button"
            @click="toggleDark"
            class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            title="切换深色模式"
          >
            <svg
              v-if="dark"
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="5" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
