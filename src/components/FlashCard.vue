<script setup lang="ts">
import type { Word } from '@/types'
import { useSpeech } from '@/composables/useSpeech'

const props = defineProps<{ word: Word; flipped: boolean }>()
defineEmits<{ flip: [] }>()

const { speak, supported } = useSpeech()

function play(e: MouseEvent) {
  e.stopPropagation()
  speak(props.word.word)
}
</script>

<template>
  <div class="card-scene">
    <div class="card" :class="{ flipped }" @click="$emit('flip')">
      <!-- 正面 -->
      <div
        class="card-face flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <div class="text-4xl font-bold text-slate-900 dark:text-slate-100 sm:text-5xl">
          {{ word.word }}
        </div>
        <div v-if="word.phonetic" class="mt-3 text-lg text-slate-500 dark:text-slate-400">
          {{ word.phonetic }}
        </div>
        <button
          v-if="supported"
          type="button"
          @click="play"
          class="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          朗读
        </button>
        <div class="absolute bottom-5 text-xs text-slate-400 dark:text-slate-500">
          点击卡片或按空格查看释义
        </div>
      </div>

      <!-- 背面 -->
      <div
        class="card-face card-back flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ word.word }}</span>
          <span v-if="word.phonetic" class="text-sm text-slate-400">{{ word.phonetic }}</span>
          <span
            v-if="word.pos"
            class="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            >{{ word.pos }}</span
          >
          <button
            v-if="supported"
            type="button"
            @click="play"
            class="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800"
            title="朗读"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </button>
        </div>

        <div class="mt-3 whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">
          {{ word.translation }}
        </div>

        <div v-if="word.example" class="mt-auto rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <div class="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {{ word.example }}
          </div>
          <div v-if="word.exampleTrans" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ word.exampleTrans }}
          </div>
        </div>
        <div
          v-else
          class="mt-auto rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700"
        >
          暂无例句
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-scene {
  perspective: 1500px;
}
.card {
  position: relative;
  height: 20rem;
  width: 100%;
  transform-style: preserve-3d;
  transition: transform 0.5s ease;
  cursor: pointer;
}
.card.flipped {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  inset: 0;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
.card-back {
  transform: rotateY(180deg);
}
</style>
