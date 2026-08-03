// 下载 Tatoeba 英中例句对（manythings.org/anki），为 cet4.json 匹配例句
// 用法: node scripts/gen-examples.mjs
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { unzipSync } from 'fflate'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CET4_PATH = join(__dirname, '..', 'src', 'data', 'cet4.json')
// manythings.org 提供的 Tatoeba 英中对照例句对（zip，tab 分隔）
const ZIP_URL = 'https://www.manythings.org/anki/cmn-eng.zip'

async function downloadPairsText() {
  console.log(`[download] ${ZIP_URL}`)
  const res = await fetch(ZIP_URL)
  if (!res.ok) throw new Error(`下载失败: HTTP ${res.status}`)
  const buf = new Uint8Array(await res.arrayBuffer())
  const files = unzipSync(buf)
  const txtName = Object.keys(files).find((n) => n.toLowerCase().endsWith('.txt'))
  if (!txtName) throw new Error('zip 中未找到 .txt: ' + Object.keys(files).join(', '))
  const text = new TextDecoder('utf-8').decode(files[txtName])
  console.log(`[unzip] ${txtName}, ${text.length} 字符`)
  return text
}

// 解析 tab 分隔例句对，自动识别英文列与中文列
function parsePairs(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const pairs = []
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 2) continue
    const a = parts[0].trim()
    const b = parts[1].trim()
    if (!a || !b) continue
    // 含中文字符的为中文，另一列为英文
    const aHasHan = /[\u4e00-\u9fff]/.test(a)
    const bHasHan = /[\u4e00-\u9fff]/.test(b)
    let en, zh
    if (aHasHan && !bHasHan) {
      zh = a
      en = b
    } else if (bHasHan && !aHasHan) {
      en = a
      zh = b
    } else {
      // 兜底：ASCII 字母占比高的为英文
      const ratio = (s) => (s.match(/[a-zA-Z]/g) || []).length / Math.max(s.length, 1)
      if (ratio(a) >= ratio(b)) {
        en = a
        zh = b
      } else {
        en = b
        zh = a
      }
    }
    pairs.push({ en, zh })
  }
  return pairs
}

// 建立 词(小写) → 最短例句 索引
function buildIndex(pairs) {
  const idx = new Map()
  for (const { en, zh } of pairs) {
    const tokens = new Set(en.toLowerCase().match(/[a-z][a-z'-]*/g) || [])
    for (const t of tokens) {
      const cur = idx.get(t)
      // 优先短句，且避免过长
      if (en.length > 160) continue
      if (!cur || en.length < cur.en.length) {
        idx.set(t, { en, zh })
      }
    }
  }
  return idx
}

async function main() {
  const text = await downloadPairsText()
  const pairs = parsePairs(text)
  console.log(`[parse] 例句对: ${pairs.length}`)
  if (pairs[0]) console.log(`[sample] en="${pairs[0].en}" zh="${pairs[0].zh}"`)

  const idx = buildIndex(pairs)
  console.log(`[index] 唯一词: ${idx.size}`)

  const words = JSON.parse(await readFile(CET4_PATH, 'utf8'))
  let matched = 0
  for (const w of words) {
    const key = w.word.toLowerCase()
    const hit = idx.get(key)
    if (hit) {
      w.example = hit.en
      w.exampleTrans = hit.zh
      matched++
    }
  }
  await writeFile(CET4_PATH, JSON.stringify(words), 'utf8')
  console.log(`[write] 已更新 ${CET4_PATH}`)
  console.log(
    `[stat] 例句匹配: ${matched}/${words.length} (${((matched / words.length) * 100).toFixed(1)}%)`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
