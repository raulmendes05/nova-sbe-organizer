// ============================================================
//  A semana do horario.
//
//  O horario nao e igual todas as semanas: as cadeiras de T1 e T2 so correm
//  no seu trimestre, ha feriados e pausas, e nos dias de compensacao corre o
//  horario de OUTRO dia da semana. Este ficheiro traduz uma semana do
//  calendario para "que aulas ha, em que dia".
// ============================================================
import { PERIODS, dayStatus, hasClasses } from '../data/calendar.js'
import { datesFor, sessionOnDate } from '../data/schedules.js'
import { officialBlock } from './enroll.js'

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
 * Cadeiras que nao correm todas as semanas (Communication: 7 sessoes de 3h em
 * datas certas). Para essas, a lista de datas manda — inclusive sobre o dia da
 * semana, porque as sessoes de compensacao mudam de dia e de hora.
 */
function turnoComDatas(block) {
  const info = officialBlock(block.title)
  if (!info || !datesFor(info.code, info.g)) return null
  return info
}

/**
 * Este bloco tem aula neste dia?
 *
 * Um bloco de T2 nao aparece durante o T1 — a cadeira ainda nem comecou. Nos
 * dias de compensacao corre o horario do dia que se esta a compensar.
 */
export function runsOn(block, dia) {
  const datado = turnoComDatas(block)
  if (datado) return Boolean(sessionOnDate(datado.code, datado.g, dia.iso))
  if (!hasClasses(dia.iso)) return false
  const dow = dia.status.type === 'makeup' ? dia.status.sourceWeekday : dia.n
  if (Number(block.day_of_week) !== dow) return false
  const termo = termOfTitle(block.title)
  return termo === 'S1' || periodOf(dia.iso) === termo
}

/**
 * O bloco como ele e NESTE dia: numa sessao de compensacao a hora pode ser
 * outra, por isso nao se pode mostrar sempre a do horario semanal.
 */
export function blockOn(block, iso) {
  const datado = turnoComDatas(block)
  if (!datado) return block
  const sessao = sessionOnDate(datado.code, datado.g, iso)
  if (!sessao || (!sessao.s && !sessao.mu)) return block
  return {
    ...block,
    start_time: sessao.s || block.start_time,
    end_time: sessao.e || block.end_time,
    location: sessao.r || block.location,
    __mu: Boolean(sessao.mu),
  }
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
    dia.blocks = (blocks || []).filter((b) => runsOn(b, dia)).map((b) => blockOn(b, iso))
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
const semAcentos = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
const nomeDoBloco = (title) => semAcentos(String(title || '').split(SEP)[0])

const toMin = (t) => {
  const [h, m] = String(t || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const pad = (n) => String(n).padStart(2, '0')
const horaDe = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/**
 * A cadeira de um prazo. A escolhida no Prazos manda; se nao houver nenhuma
 * (e o que acontece a quem escreve so o titulo), tenta o nome da cadeira
 * dentro do proprio titulo — "Apresentacao de Ethics" e de Ethics.
 */
function cadeiraDoPrazo(prazo, cursos) {
  const escolhida = prazo.course_id ? cursos.get(prazo.course_id) : null
  if (escolhida) return semAcentos(escolhida.name)
  if (prazo.course_id) return null   // cadeira apagada: nao adivinhar
  const titulo = semAcentos(prazo.title)
  const nomes = [...cursos.values()]
    .map((c) => semAcentos(c.name))
    .filter((n) => n.length >= 4 && titulo.includes(n))
  // So com um candidato — se o titulo apanha duas cadeiras nao ha certeza.
  const unicos = [...new Set(nomes)]
  return unicos.length === 1 ? unicos[0] : null
}

/**
 * Este bloco de horario e desta cadeira?
 *
 * Compara pelo NOME e nao so pelo id: o mesmo Ethics pode estar duas vezes na
 * lista de cadeiras (uma criada pelo catalogo, outra pela inscricao dos
 * turnos) e ai os ids nao batem certo, mas o prazo continua a ser daquela aula.
 */
function mesmaCadeira(block, prazo, cursos, nomeCadeira) {
  if (prazo.course_id && block.course_id && block.course_id === prazo.course_id) return true
  if (!nomeCadeira) return false
  const daAula = block.course_id ? semAcentos(cursos.get(block.course_id)?.name) : ''
  return (daAula && daAula === nomeCadeira) || nomeDoBloco(block.title) === nomeCadeira
}

/** A aula em que este prazo acontece: a que o apanha a hora certa; senao, a mais perto. */
function aulaDoPrazo(blocks, prazo, cursos, minuto) {
  const nomeCadeira = cadeiraDoPrazo(prazo, cursos)
  const candidatas = blocks.filter((b) => !b.__prazo && mesmaCadeira(b, prazo, cursos, nomeCadeira))
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
