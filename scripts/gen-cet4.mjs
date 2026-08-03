// 从 ecdict.csv 筛选 cet4 单词，生成 src/data/cet4.json
// 用法: node scripts/gen-cet4.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CSV_PATH = join(__dirname, 'data', 'ecdict.csv')
const OUT_DIR = join(__dirname, '..', 'src', 'data')
const OUT_PATH = join(OUT_DIR, 'cet4.json')

// 词性代码 → 可读词性
const POS_MAP = {
  n: 'n.',
  v: 'v.',
  a: 'adj.',
  adj: 'adj.',
  r: 'adv.',
  adv: 'adv.',
  prep: 'prep.',
  conj: 'conj.',
  pron: 'pron.',
  u: 'aux.',
  aux: 'aux.',
  num: 'num.',
  art: 'art.',
  int: 'int.',
  vt: 'vt.',
  vi: 'vi.',
  auxv: 'aux. v.',
}

// 词性提取：优先用 ECDICT pos 字段，否则从 translation 首词性标记提取
function parsePos(pos, translation) {
  if (pos) {
    const first = pos.split('/')[0].split(':')[0].trim().toLowerCase()
    if (first && POS_MAP[first]) return POS_MAP[first]
  }
  if (translation) {
    // translation 形如 "n. 州, 状态...\na. 国家的...\nvt. 说明..."
    const m = translation.match(/^([a-z]+)\./)
    if (m) {
      const p = m[1].toLowerCase()
      return POS_MAP[p] || `${p}.`
    }
  }
  return ''
}

// 从 detail 字段尝试解析例句；detail 是 JSON 扩展信息（ECDICT 基础版通常为空）
function parseExample(detail) {
  if (!detail) return ''
  try {
    const obj = JSON.parse(detail)
    const ex = obj.example || obj.examples || obj.sentence || obj.sentences
    if (Array.isArray(ex)) return ex[0] || ''
    if (typeof ex === 'string') return ex
  } catch {
    // 非 JSON，忽略
  }
  return ''
}

// 音标规范化：包裹斜杠（ECDICT 音标为 ASCII 近似，如 "steit"）
function normalizePhonetic(p) {
  const s = (p || '').trim()
  if (!s) return ''
  if (s.startsWith('/')) return s
  return `/${s}/`
}

// CSV 字段解析状态机：处理引号内的逗号与换行
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const len = text.length
  for (let i = 0; i < len; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c === '\r') {
        // 跳过
      } else {
        field += c
      }
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function toInt(v) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : 0
}

async function main() {
  console.log('[read] 读取 ecdict.csv ...')
  const text = await readFile(CSV_PATH, 'utf8')
  const rows = parseCSV(text)
  console.log(`[parse] 共 ${rows.length} 行`)

  const header = rows[0]
  const col = {}
  header.forEach((name, i) => (col[name] = i))

  const need = ['word', 'phonetic', 'definition', 'translation', 'pos', 'collins', 'tag', 'frq', 'detail']
  for (const k of need) {
    if (col[k] === undefined) throw new Error(`CSV 缺少字段: ${k}，表头: ${header.join(',')}`)
  }

  const words = []
  let withExample = 0
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    const tag = r[col.tag] || ''
    if (!tag.split(' ').includes('cet4')) continue
    const word = (r[col.word] || '').trim()
    if (!word) continue
    const example = parseExample(r[col.detail])
    if (example) withExample++
    words.push({
      word,
      phonetic: normalizePhonetic(r[col.phonetic]),
      definition: (r[col.definition] || '').trim(),
      translation: (r[col.translation] || '').trim(),
      pos: parsePos(r[col.pos], r[col.translation]),
      collins: toInt(r[col.collins]),
      frq: toInt(r[col.frq]),
      example,
      exampleTrans: '',
    })
  }
  console.log(`[filter] cet4 词条: ${words.length}，含例句: ${withExample}`)

  // 按词频排序：frq 越小越高频；frq=0 视为低频放后面
  words.sort((a, b) => {
    const fa = a.frq || 1e9
    const fb = b.frq || 1e9
    if (fa !== fb) return fa - fb
    return b.collins - a.collins
  })

  // 赋 id
  const out = words.map((w, idx) => ({ id: idx + 1, ...w }))

  await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_PATH, JSON.stringify(out), 'utf8')
  const sizeKB = (Buffer.byteLength(JSON.stringify(out), 'utf8') / 1024).toFixed(1)
  const withPos = out.filter((w) => w.pos).length
  console.log(`[write] ${OUT_PATH} (${out.length} 词, ${sizeKB} KB)`)
  console.log(`[stat] 例句覆盖率: ${((withExample / out.length) * 100).toFixed(1)}% | 词性覆盖: ${withPos}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
