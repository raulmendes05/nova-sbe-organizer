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

// ---------------------------------------------------------------------------
//  Prazos no horario
//
//  Um prazo que caia num dia em que ha aula DESSA cadeira acontece, quase
//  sempre, na propria aula: a apresentacao de Etica do dia 15 e na aula de
//  Etica desse dia. Nesse caso fica agarrado a aula (`aula.prazos`) em vez de
//  aparecer como um bloco a parte, que so faria a grelha parecer mais cheia do
//  que esta. Os outros — entregas online, prazos de cadeiras sem aula nesse
//  dia — continuam a ter bloco proprio, a hora a que sao.
// ---------------------------------------------------------------------------

// Separador entre o nome da cadeira e o turno: "Ethics — TPA (T1)".
const SEP = /\s+[—–]\s+|\s+-\s+/
const nomeDoBloco = (title) => String(title || '').split(SEP)[0].trim().toLowerCase()

const toMin = (t) => {
  const [h, m] = String(t || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const pad = (n) => String(n).padStart(2, '0')
const horaDe = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/** Este bloco de horario e desta cadeira? */
function mesmaCadeira(block, prazo, cursos) {
  if (!prazo.course_id) return false
  if (block.course_id) return block.course_id === prazo.course_id
  // Blocos escritos a mao nao tem cadeira ligada — resta o nome no titulo.
  const c = cursos.get(prazo.course_id)
  return Boolean(c?.name) && nomeDoBloco(block.title) === String(c.name).trim().toLowerCase()
}

/** A aula em que este prazo acontece: a que o apanha a hora certa; senao, a mais perto. */
function aulaDoPrazo(blocks, prazo, cursos, minuto) {
  const candidatas = blocks.filter((b) => !b.__prazo && mesmaCadeira(b, prazo, cursos))
  if (!candidatas.length) return null
  const dentro = candidatas.find((b) => minuto >= toMin(b.start_time) && minuto < toMin(b.end_time))
  if (dentro) return dentro
  return candidatas.reduce((melhor, b) =>
    Math.abs(toMin(b.start_time) - minuto) < Math.abs(toMin(melhor.start_time) - minuto) ? b : melhor)
}

/**
 * Junta os prazos aos dias de `weekOf`. Devolve dias novos: os blocos ganham
 * `prazos` (os que acontecem naquela aula) e, para os que nao encaixam em
 * nenhuma, um bloco proprio marcado com `__prazo`.
 */
export function withDeadlines(dias, prazos, courses = []) {
  const cursos = new Map((courses || []).map((c) => [c.id, c]))
  const validos = (prazos || []).filter((a) => a.due_date && a.status !== 'done')
  if (!validos.length) return dias

  return dias.map((dia) => {
    const doDia = validos.filter((a) => isoOf(new Date(a.due_date)) === dia.iso)
    if (!doDia.length) return dia

    const blocks = dia.blocks.map((b) => ({ ...b }))
    const soltos = []
    for (const a of doDia) {
      const d = new Date(a.due_date)
      const minuto = d.getHours() * 60 + d.getMinutes()
      const aula = aulaDoPrazo(blocks, a, cursos, minuto)
      if (aula) {
        const dentro = minuto >= toMin(aula.start_time) && minuto < toMin(aula.end_time)
        aula.prazos = [...(aula.prazos || []), { id: a.id, title: a.title, kind: a.kind, hora: horaDe(d), dentro }]
      } else {
        const fim = new Date(d.getTime() + 30 * 60000)
        soltos.push({
          id: `prazo-${a.id}`, title: a.title, course_id: a.course_id, kind: a.kind, __prazo: true,
          start_time: horaDe(d), end_time: horaDe(fim),
        })
      }
    }
    return { ...dia, blocks: [...blocks, ...soltos] }
  })
}
