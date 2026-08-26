// ============================================================
//  Calendário Académico 2026/27 — Nova SBE, BSc (2º e 3º ano)
//  Fonte: "Academic Calendar 2026-2027 - BSc 2nd & 3rd".
//  Datas ISO (YYYY-MM-DD). Serve a app (saber se há aulas hoje)
//  e o Cláudio (renderCalendar → contexto do assistente).
// ============================================================

export const ACADEMIC_YEAR = '2026/27'

const WEEKDAY_PT = { 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado', 7: 'domingo' }
const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// Períodos do ano (kind: 'classes' = aulas normais; 'exams' = época de exames).
export const PERIODS = [
  { key: 'T1', label: 'Aulas T1', labelEn: 'T1 classes', kind: 'classes', start: '2026-08-31', end: '2026-10-12' },
  { key: 'T1E', label: 'Exames T1', labelEn: 'T1 exams', kind: 'exams', start: '2026-10-14', end: '2026-10-20' },
  { key: 'T2', label: 'Aulas T2', labelEn: 'T2 classes', kind: 'classes', start: '2026-10-22', end: '2026-12-04' },
  { key: 'S1E', label: 'Exames T2 + Finais S1', labelEn: 'T2 exams + S1 finals', kind: 'exams', start: '2026-12-07', end: '2026-12-21' },
  { key: 'S1R', label: 'Recurso S1 (T1+T2+S1)', labelEn: 'S1 resits (T1+T2+S1)', kind: 'exams', start: '2027-01-05', end: '2027-01-12' },
  { key: 'T3', label: 'Aulas T3', labelEn: 'T3 classes', kind: 'classes', start: '2027-02-01', end: '2027-03-16' },
  { key: 'T3E', label: 'Exames T3', labelEn: 'T3 exams', kind: 'exams', start: '2027-03-18', end: '2027-03-25' },
  { key: 'T4', label: 'Aulas T4', labelEn: 'T4 classes', kind: 'classes', start: '2027-04-05', end: '2027-05-14' },
  { key: 'S2E', label: 'Exames T4 + Finais S2', labelEn: 'T4 exams + S2 finals', kind: 'exams', start: '2027-05-17', end: '2027-06-02' },
  { key: 'S2R', label: 'Recurso S2 (T3+T4+S2)', labelEn: 'S2 resits (T3+T4+S2)', kind: 'exams', start: '2027-06-14', end: '2027-06-23' },
]

// Feriados / dias sem aulas (data → nome).
export const HOLIDAYS = {
  '2026-08-15': { pt: 'Assunção de Nossa Senhora', en: 'Assumption of Mary' },
  '2026-10-05': { pt: 'Implantação da República', en: 'Republic Day' },
  '2026-10-29': { pt: 'Conferências do Estoril (sem aulas)', en: 'Estoril Conferences (no classes)' },
  '2026-11-01': { pt: 'Dia de Todos os Santos', en: 'All Saints’ Day' },
  '2026-12-01': { pt: 'Restauração da Independência', en: 'Restoration of Independence' },
  '2026-12-08': { pt: 'Imaculada Conceição', en: 'Immaculate Conception' },
  '2027-02-09': { pt: 'Carnaval', en: 'Carnival' },
  '2027-02-24': { pt: 'Career Fair / Teaching Day (sem aulas)', en: 'Career Fair / Teaching Day (no classes)' },
  '2027-03-26': { pt: 'Sexta-feira Santa', en: 'Good Friday' },
  '2027-04-25': { pt: 'Dia da Liberdade', en: 'Freedom Day' },
  '2027-05-01': { pt: 'Dia do Trabalhador', en: 'Labour Day' },
  '2027-05-27': { pt: 'Corpo de Deus', en: 'Corpus Christi' },
  '2027-06-10': { pt: 'Dia de Portugal', en: 'Portugal Day' },
  '2027-06-13': { pt: 'Santo António (Lisboa)', en: 'St Anthony’s Day (Lisbon)' },
}

// Pausas (intervalos sem aulas).
export const BREAKS = [
  { label: 'Pausa de Natal e Ano Novo', labelEn: 'Christmas and New Year break', start: '2026-12-22', end: '2027-01-02' },
  { label: 'Pausa da Páscoa', labelEn: 'Easter break', start: '2027-03-26', end: '2027-04-04' },
]

// Dias de compensação: nesse dia HÁ aulas, mas seguindo o horário do dia da
// semana do feriado compensado (`source`).
export const MAKEUP_DAYS = {
  '2026-10-12': { source: '2026-10-05', of: 'Implantação da República (05/out)', ofEn: 'Republic Day (5 Oct)' },
  '2026-12-03': { source: '2026-10-29', of: 'Conferências do Estoril (29/out)', ofEn: 'Estoril Conferences (29 Oct)' },
  '2026-12-04': { source: '2026-12-01', of: 'Restauração da Independência (01/dez)', ofEn: 'Restoration of Independence (1 Dec)' },
  '2027-03-15': { source: '2027-02-09', of: 'Carnaval (09/fev)', ofEn: 'Carnival (9 Feb)' },
  '2027-03-16': { source: '2027-02-24', of: 'Career Fair (24/fev)', ofEn: 'Career Fair (24 Feb)' },
}

// ── helpers ─────────────────────────────────────────────────
function localDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function dowOf(iso) {
  const d = localDate(iso).getDay()
  return d === 0 ? 7 : d
}
const inRange = (iso, a, b) => iso >= a && iso <= b // ISO YYYY-MM-DD compara bem lexicograficamente
const fmt = (iso) => {
  const d = localDate(iso)
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * Estado académico de uma data (YYYY-MM-DD).
 * type: 'holiday' | 'break' | 'makeup' | 'classes' | 'exams' | 'weekend' | 'none'
 * Para 'makeup', `sourceWeekday` (1-7) é o dia da semana cujas aulas correm.
 */
export function dayStatus(iso) {
  if (HOLIDAYS[iso]) return { type: 'holiday', label: HOLIDAYS[iso].pt, labelEn: HOLIDAYS[iso].en }
  const brk = BREAKS.find((b) => inRange(iso, b.start, b.end))
  if (brk) return { type: 'break', label: brk.label, labelEn: brk.labelEn }
  const mu = MAKEUP_DAYS[iso]
  if (mu) {
    const wd = dowOf(mu.source)
    return {
      type: 'makeup',
      sourceWeekday: wd,
      label: `Dia de compensação — hoje correm as aulas de ${WEEKDAY_PT[wd]}`,
      of: mu.of,
      ofEn: mu.ofEn,
    }
  }
  const p = PERIODS.find((x) => inRange(iso, x.start, x.end))
  if (p) {
    const wd = dowOf(iso)
    if (wd >= 6 && p.kind === 'classes') return { type: 'weekend', label: 'Fim de semana', labelEn: 'Weekend' }
    return { type: p.kind, key: p.key, label: p.label, labelEn: p.labelEn }
  }
  const wd = dowOf(iso)
  if (wd >= 6) return { type: 'weekend', label: 'Fim de semana', labelEn: 'Weekend' }
  return { type: 'none', label: 'Fora do período de aulas', labelEn: 'Outside the teaching period' }
}

/** true se, nessa data, há aulas normais do horário semanal. */
export function hasClasses(iso) {
  const s = dayStatus(iso)
  return s.type === 'classes' || s.type === 'makeup'
}

/** Texto compacto do calendário para o contexto do Cláudio. */
export function renderCalendar() {
  const lines = []
  lines.push(`Ano letivo ${ACADEMIC_YEAR} — BSc 2.º/3.º ano. Períodos:`)
  for (const p of PERIODS) lines.push(`- ${p.label}: ${fmt(p.start)} a ${fmt(p.end)}`)
  lines.push('Pausas:')
  for (const b of BREAKS) lines.push(`- ${b.label}: ${fmt(b.start)} a ${fmt(b.end)}`)
  lines.push('Feriados / dias sem aulas:')
  for (const [d, n] of Object.entries(HOLIDAYS)) lines.push(`- ${fmt(d)} (${WEEKDAY_PT[dowOf(d)]}): ${n.pt}`)
  lines.push('Dias de compensação (há aulas, seguindo o horário de outro dia):')
  for (const [d, m] of Object.entries(MAKEUP_DAYS)) {
    lines.push(`- ${fmt(d)} (${WEEKDAY_PT[dowOf(d)]}): correm as aulas de ${WEEKDAY_PT[dowOf(m.source)]} — compensa ${m.of}`)
  }
  lines.push('Nota: pode haver testes/exames ao sábado.')
  return lines.join('\n')
}
