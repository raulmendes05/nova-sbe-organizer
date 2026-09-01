// Verificador de traducao. Corre com: npm run check:i18n
//
// 1. paridade — toda a chave que existe num dicionario existe no outro
// 2. chaves em falta — t('...') usado no codigo mas ausente do dicionario
// 3. chaves ortas — definidas mas nunca usadas
// 4. interpolacoes — {var} do pt tem de aparecer tambem no en
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pt } from '../src/i18n/pt.js'
import { en } from '../src/i18n/en.js'

// fileURLToPath e nao .pathname: o caminho tem um espaco ("Claude Folders")
// e .pathname devolve-o codificado como %20.
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (['.js', '.jsx'].includes(extname(p))) out.push(p)
  }
  return out
}

const files = walk(SRC).filter((f) => !f.includes('/i18n/'))
const sources = files.map((f) => [f.replace(SRC, 'src'), readFileSync(f, 'utf8')])

// Duas leituras diferentes, de proposito:
//  - `called`: t('chave') — apanha chaves usadas que podem nao existir
//  - `mentioned`: a chave como literal em qualquer sitio — apanha tambem as
//    referencias indiretas (navTabs `key: 'nav.home'`, listas de sugestoes),
//    que de outra forma dariam falsos "nunca usada"
const called = new Map()
for (const [name, src] of sources) {
  for (const m of src.matchAll(/\bt\(\s*['"`]([\w.$-]+)['"`]/g)) {
    if (!called.has(m[1])) called.set(m[1], [])
    called.get(m[1]).push(name)
  }
}
const mentioned = (key) => sources.some(([, src]) =>
  src.includes(`'${key}'`) || src.includes(`"${key}"`) || src.includes(`\`${key}\``))
const used = called
// chaves construidas dinamicamente nos helpers — declaradas aqui de proposito
const DYNAMIC = [
  ...[1, 2, 3, 4, 5, 6, 7].flatMap((n) => [`day.${n}.short`, `day.${n}.long`]),
  ...['trabalho', 'exame', 'teste', 'apresentacao', 'outro'].map((v) => `kind.assignment.${v}`),
  ...['aula', 'pratica', 'seminario', 'outro'].map((v) => `kind.schedule.${v}`),
  ...['mandatory', 'area', 'general', 'additional'].map((v) => `area.${v}`),
  ...['exame', 'teste', 'recurso', 'outro'].flatMap((v) => [`examKind.${v}.one`, `examKind.${v}.plural`]),
  ...['mid', 't1', 't2', 'apr', 'exame', 'recurso'].map((v) => `examType.${v}`),
  ...['T', 'P', 'TP'].map((k) => `coursesPrompt.kind${k}`),
]
for (const k of DYNAMIC) if (!used.has(k)) used.set(k, ['(construida dinamicamente)'])

const problems = []
const ptKeys = new Set(Object.keys(pt))
const enKeys = new Set(Object.keys(en))

for (const k of ptKeys) if (!enKeys.has(k)) problems.push(`só em pt: ${k}`)
for (const k of enKeys) if (!ptKeys.has(k)) problems.push(`só em en: ${k}`)
for (const [k, where] of used) {
  if (!ptKeys.has(k)) problems.push(`usada mas não definida: ${k}  (${where[0]})`)
}
for (const k of ptKeys) {
  // "X.one" e a forma singular de "X" — o codigo chama sempre a chave base
  const isSingularOf = k.endsWith('.one') && ptKeys.has(k.slice(0, -4))
  if (!used.has(k) && !DYNAMIC.includes(k) && !isSingularOf && !mentioned(k)) {
    problems.push(`definida mas nunca usada: ${k}`)
  }
}
for (const k of ptKeys) {
  if (!enKeys.has(k)) continue
  const vars = (s) => new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))
  const a = vars(pt[k]); const b = vars(en[k])
  for (const v of a) if (!b.has(v)) problems.push(`{${v}} falta no en: ${k}`)
  for (const v of b) if (!a.has(v)) problems.push(`{${v}} falta no pt: ${k}`)
}

console.log(`${ptKeys.size} chaves · ${used.size} usadas no código`)
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`)
  for (const p of problems) console.log('  ✗ ' + p)
  process.exit(1)
}
console.log('✓ dicionários coerentes')
