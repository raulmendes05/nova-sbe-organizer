// ============================================================
//  A semana do horario.
//
//  O horario nao e igual todas as semanas: as cadeiras de T1 e T2 so correm
//  no seu trimestre, ha feriados e pausas, e nos dias de compensacao corre o
//  horario de OUTRO dia da semana. Este ficheiro traduz uma semana do
//  calendario para "que aulas ha, em que dia".
// ============================================================
import { PERIODS, dayStatus, hasClasses } from '../data/calendar.js'

export const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Segunda-feira da semana de `base`, deslocada `offset` semanas. */
export function mondayOf(base, offset = 0) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const dow = d.getDay() === 0 ? 7 : d.getDay()
  d.setDate(d.getDate() - (dow - 1) + offset * 7)
  return d
}

/** Em que periodo do calendario cai esta data ('T1', 'T2', 'S1E'...). */
export const periodOf = (iso) =>
  PERIODS.find((p) => iso >= p.start && iso <= p.end)?.key || null

/**
 * O trimestre de um bloco, lido do titulo: "Ethics — TPA (T1)" -> 'T1'.
 * Sem marca, corre o semestre inteiro.
 */
export function termOfTitle(title) {
  const m = String(title || '').match(/\((T[1-4])\)\s*$/)
  return m ? m[1] : 'S1'
}

/**
 * Este bloco tem aula neste dia?
 *
 * Um bloco de T2 nao aparece durante o T1 — a cadeira ainda nem comecou. Nos
 * dias de compensacao corre o horario do dia que se esta a compensar.
 */
export function runsOn(block, dia) {
  if (!hasClasses(dia.iso)) return false
  const dow = dia.status.type === 'makeup' ? dia.status.sourceWeekday : dia.n
  if (Number(block.day_of_week) !== dow) return false
  const termo = termOfTitle(block.title)
  return termo === 'S1' || periodOf(dia.iso) === termo
}

/**
 * Os 7 dias de uma semana, cada um com a data, o que o calendario diz dele e
 * as aulas que la correm.
 */
export function weekOf(blocks, base, offset = 0, hojeIso = isoOf(new Date())) {
  const seg = mondayOf(base, offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg.getFullYear(), seg.getMonth(), seg.getDate() + i)
    const iso = isoOf(d)
    const dia = { n: i + 1, date: d, iso, status: dayStatus(iso), hoje: iso === hojeIso }
    dia.blocks = (blocks || []).filter((b) => runsOn(b, dia))
    return dia
  })
}
