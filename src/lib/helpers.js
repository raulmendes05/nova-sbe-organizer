import { dayStatus } from '../data/calendar.js'
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
export const isCwi = (course) => String(course?.code || '') === CWI_CODE
export const isPassFail = (course) => isCwi(course)

// ECTS já ganhos numa cadeira Pass/Fail (1 por módulo concluído).
export function passFailEcts(course, components) {
  if (!isCwi(course)) return 0
  return cwiDone(components).reduce((s, m) => s + m.ects, 0)
}

// Uma cadeira está "concluída" se já tem nota final OU todas as componentes com nota.
// (usado para não mostrar exames de cadeiras que o aluno já fez)
export function isCourseDone(course, components) {
  if (isCwi(course)) return cwiDone(components).length === CWI_MODULES.length
  const f = course?.final_grade
  if (f !== null && f !== undefined && f !== '') return true
  const comps = components || []
  if (!comps.length) return false
  const totalW = comps.reduce((s, c) => s + Number(c.weight || 0), 0)
  const gradedW = comps
    .filter((c) => c.grade !== null && c.grade !== undefined && c.grade !== '')
    .reduce((s, c) => s + Number(c.weight || 0), 0)
  return totalW > 0 && totalW - gradedW <= 0.001
}

// Nota de uma cadeira: a nota final (principal) tem prioridade;
// caso nao exista, usa a media ponderada dos componentes.
export function resolveGrade(course, components) {
  // Pass/Fail não tem nota — nem sequer uma escrita à mão por engano pode
  // entrar na média.
  if (isPassFail(course)) return null
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
// compensação, usa o dia da semana que efetivamente corre nesse dia.
// horizonDays: até quão longe procurar (por defeito ~5 meses, para apanhar o
// início do semestre depois de uma pausa longa).
export function upcomingClasses(blocks, now = new Date(), limit = 3, horizonDays = 160) {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const norm = (blocks || []).map((b) => ({
    block: b, day: b.day_of_week, sMin: toMinutes(b.start_time), eMin: toMinutes(b.end_time),
  }))
  const out = []
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  for (let offset = 0; offset <= horizonDays && out.length < limit; offset++) {
    const d = new Date(base)
    d.setDate(base.getDate() + offset)
    const st = dayStatus(isoOf(d))
    if (st.type !== 'classes' && st.type !== 'makeup') continue // dia sem aulas
    // Num dia de compensação corre o horário de OUTRO dia da semana.
    const weekday = st.type === 'makeup' ? st.sourceWeekday : (d.getDay() === 0 ? 7 : d.getDay())
    const today = norm.filter((x) => x.day === weekday).sort((a, b) => a.sMin - b.sMin)
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
