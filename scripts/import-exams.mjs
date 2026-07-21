#!/usr/bin/env node
// ============================================================
//  Importar provas antigas em massa para o R2 + Supabase.
//
//  Espera uma pasta organizada como a do SharePoint da SU:
//     <Cadeira>/[EN|PT]/[Exams|Midterms|Resits]/EX_2223_S1_Sol.pdf
//  Deduz sozinho: cadeira (-> codigo do catalogo), tipo, ano letivo,
//  semestre e se tem resolucao.
//
//  Uso:
//    node scripts/import-exams.mjs --dir ~/Downloads/Bachelors [opcoes]
//      --dry-run        so mostra o que faria
//      --skip-archive   ignora as pastas "Archive*" (materia pre-2015)
//      --limit N        so os primeiros N ficheiros
//
//  Variaveis (em .env.local):
//    VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, IMPORT_AS_EMAIL
//    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
//
//  E idempotente: o caminho no R2 deriva do caminho de origem, por isso
//  correr outra vez salta o que ja esta la (da para retomar a meio).
// ============================================================
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { PROGRAMS, flatCatalog } from '../src/data/curriculum.js'

/* ---------- .env.local ---------- */
// fileURLToPath e nao .pathname: o caminho tem um espaco ("Claude Folders")
// e .pathname devolveria-o como %20, fazendo o ficheiro parecer inexistente.
const envPath = fileURLToPath(new URL('../.env.local', import.meta.url))
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

/* ---------- argumentos ---------- */
const argv = process.argv.slice(2)
const flag = (n) => argv.includes(n)
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d }
const DIR = path.resolve((opt('--dir', '') || '').replace(/^~/, process.env.HOME))
const DRY = flag('--dry-run')
const SKIP_ARCHIVE = flag('--skip-archive')
const LIMIT = Number(opt('--limit', 0)) || 0
const CONCURRENCY = 8

if (!DIR || !fs.existsSync(DIR)) {
  console.error('Falta --dir com a pasta das provas (ex: ~/Downloads/Bachelors)')
  process.exit(1)
}

/* ---------- catalogo ---------- */
const catalog = (() => {
  const m = new Map()
  for (const k of Object.keys(PROGRAMS)) for (const c of flatCatalog(k)) if (!m.has(c.code)) m.set(c.code, c)
  return [...m.values()]
})()
const norm = (s) => String(s).toLowerCase().normalize('NFD')
  .replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]/g, '')

// Pastas cujo nome nao bate certo com o catalogo atual
const ALIASES = {
  mip: '1466',                      // Managing Impactful Projects
  macropolicies: '1137',            // Macroeconomic Policies
  introductiontoprogramming: '1318',// Computer Programming
}

function matchCourse(folder) {
  const n = norm(folder)
  if (ALIASES[n]) {
    const c = catalog.find((x) => x.code === ALIASES[n])
    if (c) return { code: c.code, name: c.name }
  }
  const exact = catalog.find((c) => norm(c.name) === n)
  if (exact) return { code: exact.code, name: exact.name }
  const loose = catalog.find((c) => norm(c.name).includes(n) || n.includes(norm(c.name)))
  if (loose) return { code: loose.code, name: loose.name }
  // Cadeira antiga, fora do plano atual: mantem-se com um codigo proprio
  return { code: 'X-' + n.slice(0, 28), name: folder, legacy: true }
}

/* ---------- metadados a partir do caminho ---------- */
function kindOf(relPath, file) {
  const p = relPath.toLowerCase()
  if (p.includes('resit')) return 'recurso'
  if (p.includes('midterm') || /^mt\d?[_ .]/i.test(file)) return 'teste'
  if (p.includes('quiz') || /^quiz/i.test(file)) return 'teste'
  if (p.includes('mock') || /^mock/i.test(file)) return 'outro'
  if (p.includes('exam') || /^ex[_ .]/i.test(file)) return 'exame'
  return 'outro'
}

function yearOf(file) {
  const m = file.match(/(?:^|[^0-9])((?:0[6-9]|1[0-9]|2[0-5])(?:0[7-9]|1[0-9]|2[0-6]))(?:[^0-9]|$)/)
  if (!m) return null
  return `20${m[1].slice(0, 2)}/${m[1].slice(2)}`
}

const semesterOf = (f) => (f.match(/[_ ](S[12])(?:[_ .]|$)/i) || [])[1]?.toUpperCase() || null
const hasSolutions = (f) => /sol(u(c|ç)|ution)?/i.test(f) || /_sol\b/i.test(f)
const isPT = (rel) => /(^|\/)PT(\/|$)/.test(rel) || /\(PT\)/i.test(rel)

/* ---------- recolher ficheiros ---------- */
const EXAMISH = /(exam|midterm|resit|quiz|mock)/i
function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (SKIP_ARCHIVE && /archive/i.test(e.name)) continue
      walk(full, base, out)
    } else if (/\.(pdf|docx?|zip)$/i.test(e.name)) {
      const rel = path.relative(base, full)
      if (EXAMISH.test(rel)) out.push(rel)
    }
  }
  return out
}

let files = walk(DIR).sort()
if (LIMIT) files = files.slice(0, LIMIT)
console.log(`${files.length} ficheiros encontrados em ${DIR}`)

/* ---------- construir os registos ---------- */
const records = files.map((rel) => {
  const parts = rel.split(path.sep)
  const course = matchCourse(parts[0])
  const file = parts[parts.length - 1]
  const kind = kindOf(rel, file)
  const year = yearOf(file)
  const sem = semesterOf(file)
  const ext = (file.split('.').pop() || 'pdf').toLowerCase()
  // caminho deterministico -> re-correr o script nao duplica nada
  const hash = crypto.createHash('sha1').update(rel).digest('hex').slice(0, 16)
  return {
    rel,
    abs: path.join(DIR, rel),
    size: fs.statSync(path.join(DIR, rel)).size,
    row: {
      course_code: course.code,
      course_name: course.name,
      kind,
      school_year: year,
      title: [file.replace(/\.[^.]+$/, ''), sem, isPT(rel) ? '(PT)' : null]
        .filter(Boolean).join(' · ').slice(0, 160),
      has_solutions: hasSolutions(file),
      storage_path: `${course.code}/${hash}.${ext}`,
      file_size: fs.statSync(path.join(DIR, rel)).size,
    },
  }
})

/* ---------- resumo ---------- */
const by = (f) => records.reduce((a, r) => (a[f(r)] = (a[f(r)] || 0) + 1, a), {})
console.log('\npor tipo:   ', by((r) => r.row.kind))
console.log('com resolucao:', records.filter((r) => r.row.has_solutions).length)
console.log('sem ano:      ', records.filter((r) => !r.row.school_year).length)
const legacy = [...new Set(records.filter((r) => r.row.course_code.startsWith('X-')).map((r) => r.row.course_name))]
if (legacy.length) console.log('fora do catalogo:', legacy.join(', '))
console.log('total:', (records.reduce((a, r) => a + r.size, 0) / 1048576).toFixed(0), 'MB\n')

if (DRY) {
  for (const r of records.slice(0, 15)) {
    console.log(`  ${r.row.course_code.padEnd(10)} ${r.row.kind.padEnd(8)} ${String(r.row.school_year).padEnd(8)} ${r.rel}`)
  }
  console.log(`\n(dry-run — nada foi enviado; ${records.length} ficheiros no total)`)
  process.exit(0)
}

/* ---------- clientes ---------- */
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const EMAIL = process.env.IMPORT_AS_EMAIL
for (const [k, v] of Object.entries({ VITE_SUPABASE_URL: SUPA_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE, IMPORT_AS_EMAIL: EMAIL })) {
  if (!v) { console.error(`Falta ${k} no .env.local`); process.exit(1) }
}
const sb = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } })

// Descobrir o id da conta que vai figurar como autora dos envios
const { data: list, error: le } = await sb.auth.admin.listUsers({ perPage: 1000 })
if (le) { console.error('Erro a listar utilizadores:', le.message); process.exit(1) }
const me = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
if (!me) { console.error(`Nao encontrei a conta ${EMAIL} no Supabase.`); process.exit(1) }
console.log(`a importar como ${me.email} (${me.id})`)

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})
const BUCKET = process.env.R2_BUCKET || 'exams'

// O que ja la esta (para retomar sem duplicar)
const existing = new Set()
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('exam_files').select('storage_path').range(from, from + 999)
  if (error) { console.error(error.message); process.exit(1) }
  data.forEach((r) => existing.add(r.storage_path))
  if (data.length < 1000) break
}
const todo = records.filter((r) => !existing.has(r.row.storage_path))
console.log(`${existing.size} ja importados · ${todo.length} por importar\n`)

const MIME = { pdf: 'application/pdf', zip: 'application/zip', doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }

let done = 0, failed = 0
async function worker(queue) {
  for (;;) {
    const r = queue.shift()
    if (!r) return
    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: r.row.storage_path,
        Body: fs.readFileSync(r.abs),
        ContentType: MIME[r.row.storage_path.split('.').pop()] || 'application/octet-stream',
      }))
      const { error } = await sb.from('exam_files').insert({
        ...r.row, uploaded_by: me.id, uploader_name: 'Biblioteca SU',
      })
      if (error) throw error
      done++
    } catch (e) {
      failed++
      console.error(`  ! ${r.rel}: ${e.message}`)
    }
    if ((done + failed) % 50 === 0) console.log(`  ${done + failed}/${todo.length}...`)
  }
}

const queue = [...todo]
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)))
console.log(`\nimportados ${done} · falhados ${failed}`)
