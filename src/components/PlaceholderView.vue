<script setup lang="ts">
defineProps<{ title: string; desc?: string }>()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-16">
    <h1 class="text-3xl font-semibold text-slate-900 dark:text-slate-100">{{ title }}</h1>
    <p v-if="desc" class="mt-3 text-slate-500 dark:text-slate-400">{{ desc }}</p>
    <div
      class="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 dark:border-slate-700 dark:text-slate-500"
    >
      建设中…
    </div>
  </div>
</template>
