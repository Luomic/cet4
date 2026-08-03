// localStorage 封装：统一前缀 + JSON 序列化 + 异常容错
const PREFIX = 'cet4:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch (e) {
    console.warn('[storage] 读取失败', key, e)
    return fallback
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.error('[storage] 写入失败', key, e)
  }
}

export function remove(key: string): void {
  localStorage.removeItem(PREFIX + key)
}
