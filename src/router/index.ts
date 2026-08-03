import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // 用 hash 路由：兼容 Capacitor 的 file:// 加载与离线场景
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/flash',
      name: 'flash',
      component: () => import('@/views/FlashView.vue'),
    },
    {
      path: '/flash/report',
      name: 'flash-report',
      component: () => import('@/views/FlashReportView.vue'),
    },
    {
      path: '/learn',
      name: 'learn',
      component: () => import('@/views/LearnView.vue'),
    },
    {
      path: '/review',
      name: 'review',
      component: () => import('@/views/ReviewView.vue'),
    },
    {
      path: '/quiz',
      name: 'quiz',
      component: () => import('@/views/QuizView.vue'),
    },
    {
      path: '/stats',
      name: 'stats',
      component: () => import('@/views/StatsView.vue'),
    },
    {
      path: '/wordbook',
      name: 'wordbook',
      component: () => import('@/views/WordbookView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
  ],
})

export default router
