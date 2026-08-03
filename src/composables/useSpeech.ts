import { ref } from 'vue'

// Web Speech API 发音封装
export function useSpeech() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const speaking = ref(false)

  function speak(text: string, opts: { lang?: string; rate?: number } = {}) {
    if (!supported || !text) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = opts.lang ?? 'en-US'
    u.rate = opts.rate ?? 0.95
    u.onstart = () => (speaking.value = true)
    u.onend = () => (speaking.value = false)
    u.onerror = () => (speaking.value = false)
    window.speechSynthesis.speak(u)
  }

  function stop() {
    if (!supported) return
    window.speechSynthesis.cancel()
    speaking.value = false
  }

  return { supported, speaking, speak, stop }
}
