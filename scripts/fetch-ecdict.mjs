// 下载 ECDICT CSV（约 63MB）到 scripts/data/ecdict.csv
// 用法: node scripts/fetch-ecdict.mjs
import { createWriteStream } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const CSV_PATH = join(DATA_DIR, 'ecdict.csv')
// 仓库根目录的 ecdict.csv（76 万词条基础版，含 cet4 标签）
const URL = 'https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv'
const MIN_SIZE = 60_000_000 // 完整文件应大于 60MB

async function main() {
  await mkdir(DATA_DIR, { recursive: true })

  // 已存在且完整则跳过
  try {
    const st = await stat(CSV_PATH)
    if (st.size > MIN_SIZE) {
      console.log(`[skip] ecdict.csv 已存在 (${(st.size / 1024 / 1024).toFixed(1)}MB)`)
      return
    }
  } catch {
    // 文件不存在，继续下载
  }

  console.log(`[download] ${URL}`)
  const res = await fetch(URL)
  if (!res.ok || !res.body) throw new Error(`下载失败: HTTP ${res.status}`)

  const total = Number(res.headers.get('content-length') || 0)
  let received = 0
  let lastLog = 0

  const file = createWriteStream(CSV_PATH)
  const reader = res.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    file.write(value)
    received += value.length
    const now = Date.now()
    if (now - lastLog > 1000) {
      const pct = total ? ((received / total) * 100).toFixed(1) : '?'
      console.log(`  ${pct}%  ${(received / 1024 / 1024).toFixed(1)}MB`)
      lastLog = now
    }
  }
  file.end()
  await new Promise((r) => file.on('finish', r))
  console.log(`[done] 已保存到 ${CSV_PATH} (${(received / 1024 / 1024).toFixed(1)}MB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
