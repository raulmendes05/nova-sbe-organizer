// ============================================================
//  Inscricao: do codigo da cadeira para os blocos do horario.
//
//  O ficheiro data/schedules.js ja tem a grelha oficial (que turnos existem,
//  em que dia e a que horas). Falta so saber QUAIS o aluno frequenta — e isso
//  e o que o CoursesPrompt lhe pergunta.
// ============================================================
import { SCHEDULES } from '../data/schedules.js'

// k do horario -> kind da tabela schedule_blocks
const KIND_DB = { T: 'aula', P: 'pratica', TP: 'aula' }

const KIND_ORDER = ['T', 'P', 'TP']

/** A cadeira tem grelha publicada? (so o S1 26/27 esta carregado) */
export const hasSchedule = (code) => Boolean(SCHEDULES[String(code)]?.sessions?.length)

/**
 * Turnos de uma cadeira agrupados por tipo de aula:
 *   [{ kind: 'T', turnos: [{ g: 'TXA', term: 'S1', when: [{ d, s, e }] }] }]
 * O aluno frequenta UM turno de cada tipo.
 */
export function turnosFor(code) {
  const c = SCHEDULES[String(code)]
  if (!c?.sessions?.length) return []
  const byKind = new Map()
  for (const s of c.sessions) {
    if (!byKind.has(s.k)) byKind.set(s.k, new Map())
    const turnos = byKind.get(s.k)
    if (!turnos.has(s.g)) turnos.set(s.g, { g: s.g, term: s.t, when: [] })
    turnos.get(s.g).when.push({ d: s.d, s: s.s, e: s.e })
  }
  return KIND_ORDER
    .filter((k) => byKind.has(k))
    .map((k) => ({ kind: k, turnos: [...byKind.get(k).values()] }))
}

/**
 * Linhas para a tabela schedule_blocks a partir dos turnos escolhidos.
 * O titulo segue a convencao que o resto da app ja sabe ler — ver o
 * baseTitle() em pages/Exams.jsx: "Nome da cadeira — TXA (T1)".
 */
export function blocksFor(code, name, chosen) {
  const c = SCHEDULES[String(code)]
  if (!c?.sessions?.length || !chosen?.length) return []
  const want = new Set(chosen)
  return c.sessions
    .filter((s) => want.has(s.g))
    .map((s) => ({
      title: `${name} — ${s.g}${s.t !== 'S1' ? ` (${s.t})` : ''}`,
      day_of_week: s.d,
      start_time: s.s,
      end_time: s.e,
      kind: KIND_DB[s.k] || 'aula',
    }))
}
