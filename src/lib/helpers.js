export const DAYS = [
  { n: 1, short: 'Seg', long: 'Segunda' },
  { n: 2, short: 'Ter', long: 'Terça' },
  { n: 3, short: 'Qua', long: 'Quarta' },
  { n: 4, short: 'Qui', long: 'Quinta' },
  { n: 5, short: 'Sex', long: 'Sexta' },
  { n: 6, short: 'Sáb', long: 'Sábado' },
  { n: 7, short: 'Dom', long: 'Domingo' },
]

// JS getDay(): 0=Domingo..6=Sabado  ->  o nosso 1=Segunda..7=Domingo
export const todayDow = () => {
  const d = new Date().getDay()
  return d === 0 ? 7 : d
}

export const COURSE_COLORS = [
  '#1f5aa3', '#0f766e', '#b45309', '#7c3aed',
  '#be123c', '#2563eb', '#059669', '#c2410c',
]

export const ASSIGNMENT_KINDS = [
  { v: 'trabalho', label: 'Trabalho' },
  { v: 'exame', label: 'Exame' },
  { v: 'teste', label: 'Teste' },
  { v: 'apresentacao', label: 'Apresentacao' },
  { v: 'outro', label: 'Outro' },
]

export const SCHEDULE_KINDS = [
  { v: 'aula', label: 'Aula' },
  { v: 'pratica', label: 'Pratica' },
  { v: 'seminario', label: 'Seminario' },
  { v: 'outro', label: 'Outro' },
]

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

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('pt-PT', {
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

export function dueLabel(iso) {
  const d = daysUntil(iso)
  if (d === null) return { text: 'Sem data', tone: 'slate' }
  if (d < 0) return { text: 'Atrasado', tone: 'rose' }
  if (d === 0) return { text: 'Hoje', tone: 'rose' }
  if (d === 1) return { text: 'Amanha', tone: 'amber' }
  if (d <= 7) return { text: `${d} dias`, tone: 'amber' }
  return { text: `${d} dias`, tone: 'emerald' }
}

// Etiqueta de grupo ano/semestre para agrupar cadeiras
export function termLabel(year, term) {
  if (!year) return 'Outras cadeiras'
  return `${year}º ano${term ? ` · ${term}º semestre` : ''}`
}

// Chave ordenavel para agrupar (ano sem definir vai para o fim)
export function termKey(year, term) {
  const y = year || 99
  const t = term || 9
  return y * 10 + t
}

// Uma cadeira está "concluída" se já tem nota final OU todas as componentes com nota.
// (usado para não mostrar exames de cadeiras que o aluno já fez)
export function isCourseDone(course, components) {
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

// Aulas que vêm a seguir, por ordem, olhando para os próximos 7 dias.
// blocks: linhas de schedule_blocks. Devolve até `limit` entradas com o dia,
// o desfasamento em dias (0=hoje) e se a aula está a decorrer agora.
export function upcomingClasses(blocks, now = new Date(), limit = 3) {
  const dow = now.getDay() === 0 ? 7 : now.getDay()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const norm = (blocks || []).map((b) => ({
    block: b, day: b.day_of_week, sMin: toMinutes(b.start_time), eMin: toMinutes(b.end_time),
  }))
  const out = []
  for (let offset = 0; offset <= 7 && out.length < limit; offset++) {
    const day = ((dow - 1 + offset) % 7) + 1
    const today = norm.filter((x) => x.day === day).sort((a, b) => a.sMin - b.sMin)
    for (const x of today) {
      if (offset === 0 && x.eMin <= nowMin) continue // já terminou hoje
      out.push({
        ...x, offset,
        inProgress: offset === 0 && x.sMin <= nowMin && nowMin < x.eMin,
        minsUntil: offset === 0 ? x.sMin - nowMin : null,
      })
      if (out.length >= limit) break
    }
  }
  return out
}

// Etiqueta de quando é a aula (relativa a agora).
export function whenLabel(entry, dayLong) {
  if (!entry) return ''
  if (entry.inProgress) return `A decorrer · até ${fmtMinutes(entry.eMin)}`
  if (entry.offset === 0) {
    const d = entry.minsUntil
    if (d < 60) return `Começa em ${d} min`
    return `Hoje às ${fmtMinutes(entry.sMin)}`
  }
  if (entry.offset === 1) return `Amanhã às ${fmtMinutes(entry.sMin)}`
  return `${dayLong} às ${fmtMinutes(entry.sMin)}`
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

// Estado do objetivo de média: compara a média atual com a meta e devolve
// como mostrar (cor, barra, texto). tone: emerald=atingido, amber=perto,
// sky=ainda longe, slate=sem notas.
export function goalStatus(current, goal) {
  const g = Number(goal)
  if (!g || isNaN(g)) return null
  if (current === null || current === undefined) {
    return { pct: 0, tone: 'slate', reached: false, distance: null,
      label: 'Ainda sem notas lançadas este semestre' }
  }
  const diff = current - g
  if (diff >= -0.05) {
    return { pct: 1, tone: 'emerald', reached: true, distance: diff,
      label: diff > 0.05 ? `Objetivo atingido · +${diff.toFixed(1)}` : 'Objetivo atingido' }
  }
  const gap = -diff
  return {
    pct: Math.max(0, Math.min(1, current / g)),
    tone: gap <= 1 ? 'amber' : 'sky',
    reached: false,
    distance: gap,
    label: `A ${gap.toFixed(1)} valores do objetivo`,
  }
}
