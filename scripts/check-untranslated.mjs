// Procura texto visivel ainda codificado nos componentes (nao traduzido).
// Corre com: npm run check:untranslated
//
// Nao e um parser de JSX — e uma rede de arrasto. Apanha tres formas:
//   1. texto solto entre tags:            <p>Ola</p>
//   2. atributos de texto:                placeholder="Ola"  title="Ola"
//   3. strings passadas a alert/confirm:  confirm('Apagar?')
// Ficheiros de dados (src/data) e os dicionarios ficam de fora de proposito.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const SKIP_DIRS = ['/i18n/', '/data/']

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (['.js', '.jsx'].includes(extname(p))) out.push(p)
  }
  return out
}

// Palavras que aparecem em codigo e nao sao texto para o utilizador
const CODE_NOISE = /^(true|false|null|undefined|div|span|button|input|select|option|form|label|section|aside|main|nav|svg|path|rect|circle|href|http|https|target|noreferrer|noopener|application|text|json|utf|PUT|POST|GET)$/i

const ATTR = /\b(placeholder|title|hint|aria-label|label|alt)\s*=\s*"([^"]{2,})"/g
// Uma linha so, e sem caracteres de codigo: senao o `>` de uma comparacao
// (`a > b`) casa com o `<` seguinte e o resultado e ruido.
// `(?<![=-])` afasta as setas `=>` e o operador `->`; `&` afasta condicoes
// como `a > 0 && b < c`, que de outra forma passavam por texto.
const TEXT = /(?<![=-])>([^<>{}()=;&\n]{3,})</g

// Marcas, ficheiros e unidades que ficam iguais nos dois idiomas.
const ALLOW = /^(Nova SBE Organizer|Organizer|Supabase|SETUP\.md|\.env\.local|ECTS|Nova SBE|Cláudio)$/
const DIALOG = /\b(?:window\.)?(?:confirm|alert|prompt)\(\s*['"`]([^'"`]{3,})/g

let problems = 0
for (const file of walk(SRC)) {
  if (SKIP_DIRS.some((d) => file.includes(d))) continue
  const src = readFileSync(file, 'utf8')
  const hits = []
  for (const [, attr, val] of src.matchAll(ATTR)) {
    if (!/[a-zà-ÿ]{3}/i.test(val) || CODE_NOISE.test(val)) continue
    hits.push(`${attr}="${val}"`)
  }
  for (const [, val] of src.matchAll(TEXT)) {
    const v = val.trim()
    // ignora simbolos, entidades e fragmentos de classe/estilo
        if (!/[a-zà-ÿ]{3}/i.test(v) || CODE_NOISE.test(v) || ALLOW.test(v)) continue
    if (/^[&#·—–✓✕▾›»…\d\s./%-]+$/.test(v)) continue
    hits.push(`texto: ${v}`)
  }
  for (const [, val] of src.matchAll(DIALOG)) hits.push(`diálogo: ${val}`)
  if (hits.length) {
    problems += hits.length
    console.log(`\n${file.replace(SRC, 'src')}`)
    for (const h of hits) console.log('  ✗ ' + h)
  }
}
console.log(problems ? `\n${problems} texto(s) por traduzir` : '✓ nenhum texto codificado nos componentes')
process.exit(problems ? 1 : 0)
