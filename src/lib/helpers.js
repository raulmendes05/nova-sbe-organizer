import { dayStatus } from '../data/calendar.js'
import { blocksOn } from './week.js'
import { CWI_CODE, CWI_MODULES, cwiDone } from '../data/cwi.js'

// ---------------------------------------------------------------------------
//  Texto visivel ao utilizador
//
//  Estes helpers vivem fora do React, por isso nao podem usar o hook useT().
//  Recebem `t` como argumento — quem os chama ja o tem. O fallback devolve a
//  propria chave (ex.: "day.1.long"), o que torna uma chamada esquecida obvia
//  no ecra em vez de a esconder atras de portugues codificado ou de rebentar.
// ---------------------------------------------------------------------------
const KEY = (k) => k

// Locale do Intl para cada idioma da app.
export const localeOf = (lang) => (lang === 'en' ? 'en-GB' : 'pt-PT')

// 1=Segunda .. 7=Domingo. Os rotulos vem da traducao.
export const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7]
export const days = (t = KEY) =>
  DAY_NUMBERS.map((n) => ({ n, short: t(`day.${n}.short`), long: t(`day.${n}.long`) }))
export const dayLong = (t = KEY, n) => t(`day.${n}.long`)
export const dayShort = (t = KEY, n) => t(`day.${n}.short`)

// JS getDay(): 0=Domingo..6=Sabado  ->  o nosso 1=Segunda..7=Domingo
export const todayDow = () => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

export const COURSE_COLORS = [
  '#1f5aa3', '#0f766e', '#b45309', '#7c3aed',
  '#be123c', '#2563eb', '#059669', '#c2410c',
]

export const ASSIGNMENT_KIND_VALUES = ['trabalho', 'exame', 'teste', 'apresentacao', 'outro']
export const assignmentKinds = (t = KEY) =>
  ASSIGNMENT_KIND_VALUES.map((v) => ({ v, label: t(`kind.assignment.${v}`) }))

export const SCHEDULE_KIND_VALUES = ['aula', 'pratica', 'seminario', 'outro']
export const scheduleKinds = (t = KEY) =>
  SCHEDULE_KIND_VALUES.map((v) => ({ v, label: t(`kind.schedule.${v}`) }))

// "14:30:00" -> "14:30"
export const hhmm = (t) => (t ? t.slice(0, 5) : '')

// Clareia uma cor hex em direcao ao branco (para legibilidade em fundo escuro)
export function lighten(hex = '#3d78bf', amount = 0.5) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  if (!m) return '#9ec1e8'
  const mix = (c) => Math.round(parseInt(c, 16) + (255 - parseInt(c, 16)) * amount)
  const [r, g, b] = [mix(m[1]), mix(m[2]), mix(m[3])]
  return `rgb(${r}, ${g}, ${b})`
}

export function formatDate(iso, lang = 'pt') {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(localeOf(lang), { day: '2-digit', month: 'short' })
}

export function formatDateTime(iso, lang = 'pt') {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString(localeOf(lang), {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// Dias de calendário que faltam para uma data (0 = hoje, 1 = amanhã, -1 = ontem).
// Compara só o dia (ignora a hora), para um prazo hoje às 15:00 dar "Hoje".
export function daysUntil(iso) {
  if (!iso) return null
  const now = new Date()
  const then = new Date(iso)
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(then.getFullYear(), then.getMonth(), then.getDate())
  return Math.round((b - a) / (1000 * 60 * 60 * 24))
}

export function dueLabel(iso, t = KEY) {
  const d = daysUntil(iso)
  if (d === null) return { text: t('due.none'), tone: 'slate' }
  if (d < 0) return { text: t('due.late'), tone: 'rose' }
  if (d === 0) return { text: t('due.today'), tone: 'rose' }
  if (d === 1) return { text: t('due.tomorrow'), tone: 'amber' }
  return { text: t('due.days', { n: d }), tone: d <= 7 ? 'amber' : 'emerald' }
}

// ---------------------------------------------------------------------------
//  Números escritos à mão
//
//  Os atributos min/max de um <input type="number"> não impedem nada por si:
//  só contam quando o browser valida um FORMULÁRIO, e boa parte destes campos
//  guarda-se ao sair do campo ou com um botão próprio. Era assim que uma nota
//  de 38 entrava numa escala de 0 a 20.
//
//  A verificação diz o que está mal em vez de corrigir por conta própria: um
//  38 encurtado para 20 em silêncio seria inventar uma nota que ninguém teve.
// ---------------------------------------------------------------------------
// Passo dos campos de nota. O `step` de um <input type="number"> nao e so
// cosmetica: com step="0.1" o browser RECUSA 7,65 no submit ("os valores
// validos mais proximos sao 7,6 e 7,7") e a nota nunca chegava a ser guardada.
// As colunas sao `numeric` sem precisao fixa, por isso 7,65 cabe na base de
// dados tal como foi escrito.
export const GRADE_STEP = '0.01'
// Pesos repartidos em tercos dao 33,3 ou 33,33 — com step="1" eram recusados
// os dois. Duas casas em todos estes campos e o mesmo que a app mostra, por
// isso nada do que entra aparece depois arredondado.
export const WEIGHT_STEP = '0.01'

export const LIMITS = {
  grade: { min: 0, max: 20 },        // escala portuguesa
  weight: { min: 0, max: 100 },      // peso de uma componente, em %
  ects: { min: 0, max: 60 },         // ECTS de uma cadeira (um semestre inteiro são 30)
  ectsTotal: { min: 0, max: 360 },   // ECTS de um percurso completo
  semesters: { min: 1, max: 12 },
}

/** null se o valor serve; senão a mensagem do que está mal. */
export function checkNumber(raw, { min, max }, t = KEY, { required = false } = {}) {
  const s = String(raw ?? '').trim()
  if (s === '') return required ? t('valid.required') : null
  const n = Number(s)
  if (!isFinite(n)) return t('valid.notNumber')
  if (n < min || n > max) return t('valid.range', { min, max })
  return null
}

// Os 6 semestres de uma licenciatura. Serve os campos de "feito em" das
// cadeiras que se fazem ao longo do curso (Data Handling, modulos do Careers
// with Impact) — para as duas listarem exatamente as mesmas hipoteses.
export const DEGREE_TERMS = [[1, 1], [1, 2], [2, 1], [2, 2], [3, 1], [3, 2]]

// Etiqueta de grupo ano/semestre para agrupar cadeiras
export function termLabel(year, term, t = KEY) {
  if (!year) return t('term.other')
  return term ? t('term.yearAndTerm', { year, term }) : t('term.year', { year })
}

// Chave ordenavel para agrupar (ano sem definir vai para o fim)
export function termKey(year, term) {
  const y = year || 99
  const t = term || 9
  return y * 10 + t
}

// ---------------------------------------------------------------------------
//  Cadeiras Pass/Fail — feito / não feito, sem nota
//
//  Careers with Impact não tem nota: são 4 módulos de 1 ECTS marcados como
//  feitos. A folha oficial da escola trata-os assim (escreve "Done" na célula
//  da nota), o que os deixa FORA da média mas com os ECTS a contar assim que
//  estão concluídos — é exatamente o que estes helpers fazem.
// ---------------------------------------------------------------------------
// Careers with Impact e os dois Data Handling: a folha oficial da escola marca
// as três com "(Done/Not Done)" em vez de nota.
export const PASS_FAIL_CODES = new Set([CWI_CODE, '1321', '1322'])
export const isCwi = (course) => String(course?.code || '') === CWI_CODE
export const isPassFail = (course) => PASS_FAIL_CODES.has(String(course?.code || ''))

// Uma cadeira Pass/Fail simples fica marcada com uma linha em `grades` sem
// nota nenhuma: existir = feita. O mesmo que os módulos do Careers with
// Impact, sem inventar números na base de dados.
export const PASS_MARK = 'Pass'
export const passRow = (components) =>
  (components || []).find((r) => String(r.title || '').trim() === PASS_MARK) || null
export const isPassed = (course, components) =>
  isPassFail(course) && !isCwi(course) && Boolean(passRow(components))

// ECTS já ganhos numa cadeira Pass/Fail (no Careers with Impact, 1 por módulo).
//
// Uma equivalência também pode ficar aqui: as cadeiras feitas em Erasmus vêm
// convertidas em Pass/Fail, e a folha da escola conta-lhes os créditos ainda
// que não lhes conte a nota.
export function passFailEcts(course, components) {
  if (isCwi(course)) return cwiDone(components).reduce((s, m) => s + m.ects, 0)
  if (!isPassFail(course) && !course?.is_equivalence) return 0
  return passRow(components) ? Number(course.ects || 0) : 0
}

/**
 * Em que semestre e que uma cadeira Pass/Fail foi feita: { year, term }.
 *
 * Fica na linha do Pass e nao na cadeira, pelo mesmo motivo dos modulos do
 * Careers with Impact: os dois Data Handling fazem-se ao longo do curso, fora
 * dos semestres, e o que decide se o ECTS conta numa candidatura a Erasmus e a
 * data em que ficou FEITO. Sem data propria, cai no ano/semestre da cadeira —
 * que era o que valia antes de isto existir.
 */
export function passPeriod(components, course) {
  const r = passRow(components)
  return {
    year: r?.year ?? course?.year ?? null,
    term: r?.term ?? course?.term ?? null,
    proprio: Boolean(r?.year && r?.term),   // false = herdado da cadeira
  }
}

// Uma cadeira está "concluída" se já tem nota final OU todas as componentes com nota.
// (usado para não mostrar exames de cadeiras que o aluno já fez)
// Os pesos sao percentagens: as componentes so descrevem a cadeira inteira
// quando somam 100. A folga e para quem reparte em tercos (33,3 x 3 = 99,9).
const PESO_COMPLETO = 99.5

export function isCourseDone(course, components) {
  if (isCwi(course)) return cwiDone(components).length === CWI_MODULES.length
  if (isPassFail(course)) return Boolean(passRow(components))
  const f = course?.final_grade
  if (f !== null && f !== undefined && f !== '') return true
  const comps = components || []
  if (!comps.length) return false
  const totalW = comps.reduce((s, c) => s + Number(c.weight || 0), 0)
  // So se conclui "feita" quando as componentes cobrem a cadeira TODA. Quem
  // lanca a nota do teste de setembro e mais nada fica com 40% lancados em 40%
  // registados — e isso nao quer dizer que acabou a cadeira, quer dizer
  // precisamente o contrario: ainda falta o exame. Sem esta linha, a cadeira
  // saia da lista dos exames a chegar no dia em que o aluno lancava a primeira
  // nota.
  if (totalW < PESO_COMPLETO) return false
  const gradedW = gradedWeight(comps)
  return totalW - gradedW <= 0.001
}

// Nota de uma cadeira: a nota final (principal) tem prioridade;
// caso nao exista, usa a media ponderada dos componentes.
export function resolveGrade(course, components) {
  // Pass/Fail não tem nota — nem sequer uma escrita à mão por engano pode
  // entrar na média.
  if (isPassFail(course)) return null
  // Uma equivalência marcada como Pass é o mesmo caso: vale créditos, não vale
  // nota, mesmo que tenha sobrado um número de antes.
  if (course?.is_equivalence && passRow(components)) return null
  const f = course?.final_grade
  if (f !== null && f !== undefined && f !== '') return Number(f)
  return courseAverage(components)
}

// Escala portuguesa 0-20
export function courseAverage(components) {
  const graded = components.filter((c) => c.grade !== null && c.grade !== undefined && c.grade !== '')
  if (!graded.length) return null
  const totalWeight = graded.reduce((s, c) => s + Number(c.weight || 0), 0)
  if (totalWeight <= 0) return null
  const sum = graded.reduce((s, c) => s + Number(c.grade) * Number(c.weight || 0), 0)
  return sum / totalWeight
}

/**
 * Nota em texto: uma casa decimal, duas quando o aluno precisou delas.
 *
 * Quem teve 7,65 tem de ver 7,65 — arredondar para 7,7 fazia parecer que a app
 * tinha deitado fora o que ele escreveu. E com notas de passagem a 9,45 nem
 * era so aparencia: uma media de 9,449 mostrada como "9,5" dava uma cadeira
 * por passada quando estava reprovada.
 */
export function fmtGrade(n, vazio = '—') {
  if (n === null || n === undefined || n === '') return vazio
  const v = Number(n)
  if (!isFinite(v)) return vazio
  // Redondo a uma casa (15 -> 15,0) ou a duas (7,65) — nunca mais do que isso,
  // que seria precisao inventada por uma divisao.
  const casas = Math.abs(v * 10 - Math.round(v * 10)) < 1e-9 ? 1 : 2
  return v.toFixed(casas)
}

// Simulador: que nota (média) é precisa nas componentes que faltam para
// atingir um objetivo `target` (0-20). Normaliza pelo peso total planeado.
export function simulateGrade(components, target) {
  const comps = components || []
  const totalW = comps.reduce((s, c) => s + Number(c.weight || 0), 0)
  if (totalW <= 0) return null
  const graded = comps.filter((c) => c.grade !== null && c.grade !== undefined && c.grade !== '')
  const wGraded = graded.reduce((s, c) => s + Number(c.weight || 0), 0)
  const earned = graded.reduce((s, c) => s + Number(c.grade) * Number(c.weight || 0), 0)
  const remainingW = totalW - wGraded
  if (remainingW <= 0.001) return { done: true, totalW }
  const needed = (Number(target) * totalW - earned) / remainingW
  return {
    done: false,
    totalW,
    remainingW,
    remainingPct: Math.round((remainingW / totalW) * 100),
    needed,
    guaranteed: needed <= 0,       // já atingido mesmo com 0 no resto
    impossible: needed > 20,       // já não é possível
  }
}

// Percentagem de avaliacao ja com nota lancada
export function gradedWeight(components) {
  return components
    .filter((c) => c.grade !== null && c.grade !== undefined && c.grade !== '')
    .reduce((s, c) => s + Number(c.weight || 0), 0)
}

// "14:30:00" | "14:30" -> minutos desde a meia-noite
const toMinutes = (t) => {
  const [h, m] = String(t || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const fmtMinutes = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Aulas que vêm a seguir, por ordem. Respeita o CALENDÁRIO ACADÉMICO: só conta
// dias em que há mesmo aulas (ignora pausas, feriados e o verão) e, nos dias de
// compensação, usa o dia da semana que efetivamente corre nesse dia. As aulas
// desmarcadas numa semana (`excecoes`) não contam: dizer ao aluno para ir a
// uma aula que ele próprio cancelou era pior do que não dizer nada.
// horizonDays: até quão longe procurar (por defeito ~5 meses, para apanhar o
// início do semestre depois de uma pausa longa).
export function upcomingClasses(blocks, now = new Date(), limit = 3, horizonDays = 160, excecoes = []) {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const out = []
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let offset = 0; offset <= horizonDays && out.length < limit; offset++) {
    const d = new Date(base)
    d.setDate(base.getDate() + offset)
    const iso = isoOf(d)
    // A mesma regra da grelha (lib/week.js): trimestre certo, feriados,
    // dias de compensação e as cadeiras que só têm aula em datas certas.
    const dia = { n: d.getDay() === 0 ? 7 : d.getDay(), iso, status: dayStatus(iso) }
    const today = blocksOn(blocks, dia, excecoes)
      .map((b) => ({ block: b, day: b.day_of_week, sMin: toMinutes(b.start_time), eMin: toMinutes(b.end_time) }))
      .sort((a, b) => a.sMin - b.sMin)
    for (const x of today) {
      if (offset === 0 && x.eMin <= nowMin) continue // já terminou hoje
      out.push({
        ...x, offset, date: d,
        inProgress: offset === 0 && x.sMin <= nowMin && nowMin < x.eMin,
        minsUntil: offset === 0 ? x.sMin - nowMin : null,
      })
      if (out.length >= limit) break
    }
  }
  return out
}

// Etiqueta de quando é a aula (relativa a agora).
export function whenLabel(entry, dayName, t = KEY, lang = 'pt') {
  if (!entry) return ''
  if (entry.inProgress) return t('when.now', { end: fmtMinutes(entry.eMin) })
  if (entry.offset === 0) {
    const d = entry.minsUntil
    if (d < 60) return t('when.inMin', { n: d })
    return t('when.today', { time: fmtMinutes(entry.sMin) })
  }
  if (entry.offset === 1) return t('when.tomorrow', { time: fmtMinutes(entry.sMin) })
  if (entry.offset <= 6) return t('when.weekday', { day: dayName, time: fmtMinutes(entry.sMin) })
  // mais de uma semana → mostra a data, senão "Segunda" seria ambíguo
  const date = entry.date.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })
  return t('when.date', { date, time: fmtMinutes(entry.sMin) })
}

export const classTimeRange = (entry) => `${fmtMinutes(entry.sMin)}–${fmtMinutes(entry.eMin)}`

// Média ponderada por ECTS de um conjunto de itens { ects, avg }.
// Ignora itens sem nota (avg null). Devolve null se não houver notas.
export function weightedAvg(items) {
  const withAvg = (items || []).filter((x) => x.avg !== null && x.avg !== undefined)
  const ects = withAvg.reduce((s, x) => s + Number(x.ects || 0), 0)
  if (ects <= 0) return null
  return withAvg.reduce((s, x) => s + x.avg * Number(x.ects || 0), 0) / ects
}

/**
 * GPA de Erasmus — a metrica que a Nova usa nas candidaturas a mobilidade.
 * Nao e a media: sao 75% de nota e 25% de ritmo de creditos.
 *
 *   ((0.75*5)*ROUND(gpa,2) + (0.25*100)*(ects/(30*semestres))) / 5
 *
 * Copiada tal e qual do "GPA Calculators Bachelors.xlsx" da escola, incluindo
 * o arredondamento da GPA a 2 casas ANTES da conta e o do resultado no fim.
 * 30 ECTS e o semestre cheio, por isso ects/(30*semestres) e a fracao do
 * percurso ja concluida — e nao esta limitada a 1, tal como na folha.
 */
export function erasmusGpa(gpa, ects, semesters) {
  // Number(null) e 0 e Number('') tambem — sem isto, uma media ainda por
  // calcular passava por um zero legitimo.
  const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v))
  const g = num(gpa)
  const e = num(ects)
  const s = num(semesters)
  if (!isFinite(g) || !isFinite(e) || !isFinite(s) || s <= 0 || e <= 0 || g < 0) return null
  const ritmo = e / (30 * s)
  const valor = ((0.75 * 5) * round2(g) + (0.25 * 100) * ritmo) / 5
  return { gpa: round2(g), ritmo, valor: Math.round(valor * 100) / 100 }
}

/**
 * A ordem de um semestre no percurso: 1.o ano 1.o sem = 1, ... 3.o ano 2.o sem = 6.
 * E o que permite contar quantos semestres ja se concluiram.
 */
export const termOrdinal = (year, term) => (Number(year) - 1) * 2 + Number(term)

/**
 * O que conta para uma candidatura a mobilidade feita num dado semestre.
 *
 * A candidatura e avaliada com as notas ATE ao semestre anterior — o semestre
 * em que se concorre ainda esta a decorrer e as suas notas ainda nao existem
 * quando a escola olha para o processo. Quem ja tivesse lancado na app notas do
 * semestre em curso via uma GPA que a escola nunca lhe ia dar: mais alta ou
 * mais baixa, mas sempre a errada.
 *
 * As equivalencias NAO entram — nem na nota nem nos creditos.
 *
 * A folha da Uniao de Estudantes conta-lhes os ECTS (o "Completed ECTs" e
 * IF(Grade<>"", ECTS, ""), e um "PASS" preenche a celula), mas a propria folha
 * avisa que nao foi validada pela Nova. E, sobretudo, a conta e feita no
 * momento da CANDIDATURA: quem se candidata a Erasmus ainda nao o fez, por
 * isso esses creditos nao deviam sequer existir no calculo. Conta-los inflava
 * os 25% do ritmo com creditos que a escola ainda nao ve.
 *
 * Na nota (os 75%) nunca entraram: o Weight da folha e IF(ISNUMBER(Grade),...)
 * e uma linha marcada PASS nao e um numero.
 *
 * `items`: { ects, avg, year, term, isEquivalence, creditos }
 *   `creditos`: os ECTS Pass/Fail ja ganhos nesta cadeira, cada um com a sua
 *   propria data — [{ ects, year, term }]. Os 4 modulos do Careers with Impact
 *   fazem-se ao longo do curso, um por semestre, e cada um conta no seu.
 * `applyKey`: o termKey(ano, semestre) em que se concorre.
 */
export function erasmusScope(items, applyYear, applyTerm) {
  const applyKey = termKey(applyYear, applyTerm)
  const lista = items || []

  // Um periodo so conta se estiver fechado antes do semestre da candidatura.
  const antes = (year, term) => Boolean(year && term) && termKey(year, term) < applyKey

  const conta = (x) => {
    if (x.isEquivalence) return false             // creditadas de fora: nao contam
    return antes(x.year, x.term)                  // sem semestre: nao da para situar
  }

  const dentro = lista.filter(conta)
  const comNota = dentro.filter((x) => x.avg !== null && x.avg !== undefined)

  // A folha da escola nao trata as equivalencias a parte: o que decide e a nota
  // da linha. Com um numero, a cadeira entra na media (os 75%) E nos creditos;
  // marcada Pass/Fail — que e como as cadeiras de Erasmus voltam — vale so os
  // creditos (os 25%). Ver o "GPA Calculators Bachelors": Weight so conta
  // linhas com ISNUMBER, mas Completed ECTs conta toda a linha com a celula da
  // nota preenchida. Daqui sai a soma: ECTS com nota + creditos Pass/Fail.
  // Os creditos Pass/Fail nao seguem a cadeira: cada um tem a sua data, por isso
  // filtram-se um a um. Um Careers with Impact com o Modulo I feito no 1.o ano e
  // o IV por fazer conta 1 ECTS, nao 4 nem 0.
  const creditos = lista
    .filter((x) => !x.isEquivalence)
    .flatMap((x) => x.creditos || [])
    .filter((c) => antes(c.year, c.term))
  const ectsPassFail = creditos.reduce((t, c) => t + Number(c.ects || 0), 0)

  const ects = comNota.reduce((t, x) => t + Number(x.ects || 0), 0) + ectsPassFail

  // Cadeiras com nota que ficaram de fora — e a diferenca que o aluno ve.
  const foraComNota = lista.filter((x) => !conta(x) && x.avg !== null && x.avg !== undefined)

  // As equivalencias que ficaram de fora — o aluno tem de saber que existem e
  // porque e que nao aparecem na soma.
  const equivalencias = lista.filter((x) =>
    x.isEquivalence && (x.avg !== null && x.avg !== undefined || (x.creditos || []).length > 0))
  // Creditos Pass/Fail ja ganhos mas ainda sem data util (deste semestre ou sem
  // semestre): o aluno perde-os na conta sem perceber porque.
  const creditosFora = lista
    .filter((x) => !x.isEquivalence)
    .flatMap((x) => x.creditos || [])
    .filter((c) => !antes(c.year, c.term))

  return {
    gpa: weightedAvg(comNota),
    ects,
    semestres: Math.max(0, termOrdinal(applyYear, applyTerm) - 1),
    contadas: comNota.length,
    equivalencias: equivalencias.length,
    ectsEquivalencias: equivalencias.reduce((t, x) => t + Number(x.ects || 0), 0),
    ectsPassFail,
    creditosFora: creditosFora.length,
    ectsCreditosFora: creditosFora.reduce((t, c) => t + Number(c.ects || 0), 0),
    // Do semestre em curso ou de um semestre futuro: nao entram, e e de proposito.
    excluidas: foraComNota.filter((x) => !x.isEquivalence && x.year && x.term).length,
    // Sem ano/semestre definido: a app nao as sabe situar e o aluno tem de as arrumar.
    semPeriodo: foraComNota.filter((x) => !x.isEquivalence && (!x.year || !x.term)).length,
  }
}

const round2 = (n) => Math.round(n * 100) / 100

// Estado do objetivo de média: compara a média atual com a meta e devolve
// como mostrar (cor, barra, texto). tone: emerald=atingido, amber=perto,
// sky=ainda longe, slate=sem notas.
export function goalStatus(current, goal, t = KEY) {
  const g = Number(goal)
  if (!g || isNaN(g)) return null
  if (current === null || current === undefined) {
    return { pct: 0, tone: 'slate', reached: false, distance: null,
      label: t('goal.noGrades') }
  }
  const diff = current - g
  if (diff >= -0.05) {
    return { pct: 1, tone: 'emerald', reached: true, distance: diff,
      label: diff > 0.05 ? t('goal.reachedBy', { n: diff.toFixed(1) }) : t('goal.reached') }
  }
  const gap = -diff
  return {
    pct: Math.max(0, Math.min(1, current / g)),
    tone: gap <= 1 ? 'amber' : 'sky',
    reached: false,
    distance: gap,
    label: t('goal.away', { n: gap.toFixed(1) }),
  }
}
