// ============================================================
//  Inscricao: do codigo da cadeira para os blocos do horario.
//
//  O ficheiro data/schedules.js ja tem a grelha oficial (que turnos existem,
//  em que dia e a que horas). Falta so saber QUAIS o aluno frequenta — e isso
//  e o que o EnrollFlow lhe pergunta.
// ============================================================
import { SCHEDULES } from '../data/schedules.js'

// k do horario -> kind da tabela schedule_blocks
const KIND_DB = { T: 'aula', P: 'pratica', TP: 'aula' }

const KIND_ORDER = ['T', 'P', 'TP']

/** A cadeira tem grelha publicada? (so o S1 26/27 esta carregado) */
export const hasSchedule = (code) => Boolean(SCHEDULES[String(code)]?.sessions?.length)

/**
 * Turnos de uma cadeira agrupados por tipo de aula:
 *   [{ kind: 'T', turnos: [{ g: 'TXA', term: 'S1', when: [{ d, s, e, r }] }] }]
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
    turnos.get(s.g).when.push({ d: s.d, s: s.s, e: s.e, r: s.r || null })
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
      location: s.r || null,
      kind: KIND_DB[s.k] || 'aula',
    }))
}

// Separador entre o nome da cadeira e o turno no titulo de um bloco.
// O mesmo que o baseTitle() de pages/Exams.jsx usa para ler estes titulos.
const SEP = /\s+[—–]\s+|\s+-\s+/

/**
 * A sala de um bloco de horario JA GRAVADO, a partir do titulo, dia e hora.
 *
 * Os horarios criados antes de a escola publicar as salas ficaram com o campo
 * vazio; isto permite preenche-los sem o aluno ter de refazer nada.
 * Devolve null se nao houver correspondencia certa — mais vale ficar vazio do
 * que pôr a sala errada.
 */
export function roomFor(title, day, startTime) {
  const partes = String(title || '').split(SEP)
  const turno = (partes[1] || '').split('(')[0].trim()
  if (!turno) return null
  const hhmm = String(startTime || '').slice(0, 5)
  const nome = (partes[0] || '').trim().toLowerCase()

  const hits = []
  for (const c of Object.values(SCHEDULES)) {
    for (const s of c.sessions) {
      if (s.r && s.g === turno && s.d === Number(day) && s.s === hhmm) {
        hits.push({ nome: c.name.toLowerCase(), r: s.r })
      }
    }
  }
  if (hits.length === 1) return hits[0].r
  // Duas cadeiras com o mesmo turno a mesma hora — so o nome desempata.
  const exato = hits.filter((h) => h.nome === nome)
  return exato.length === 1 ? exato[0].r : null
}

/**
 * Le o titulo de um bloco criado a partir da grelha oficial
 * ("Microeconomics — TXA (T1)") e devolve { code, g }.
 *
 * Devolve null para tudo o resto — inclusive aulas que o aluno escreveu a mao.
 * E o que permite acertar os turnos sem lhe apagar o que ele proprio criou.
 */
export function officialBlock(title) {
  const partes = String(title || '').split(SEP)
  const g = (partes[1] || '').split('(')[0].trim()
  const nome = (partes[0] || '').trim().toLowerCase()
  if (!g || !nome) return null
  for (const [code, c] of Object.entries(SCHEDULES)) {
    if (c.name.toLowerCase() === nome && c.sessions.some((s) => s.g === g)) return { code, g }
  }
  return null
}

// ---------------------------------------------------------------------------
//  Sobreposições entre turnos
//
//  O aluno escolhe um turno de cada tipo, e nada o impedia de ficar com duas
//  aulas à mesma hora — só dava por isso na primeira semana de aulas.
//  T1 e T2 nunca se cruzam (correm em metades diferentes do semestre); um
//  turno de semestre inteiro (S1) cruza-se com tudo.
// ---------------------------------------------------------------------------
const emMinutos = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const coexistem = (a, b) => a === 'S1' || b === 'S1' || a === b

/** As sessões de um turno de uma cadeira. */
export const sessionsOf = (code, g) =>
  (SCHEDULES[String(code)]?.sessions || []).filter((s) => s.g === g)

/**
 * A primeira hora em que estes dois turnos se pisam, ou null.
 * Devolve { d, s, e } — dia e o pedaço de tempo em comum.
 */
export function turnoClash(aCode, aG, bCode, bG) {
  for (const x of sessionsOf(aCode, aG)) {
    for (const y of sessionsOf(bCode, bG)) {
      if (x.d !== y.d || !coexistem(x.t, y.t)) continue
      const inicio = Math.max(emMinutos(x.s), emMinutos(y.s))
      const fim = Math.min(emMinutos(x.e), emMinutos(y.e))
      if (inicio < fim) {
        const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
        return { d: x.d, s: hhmm(inicio), e: hhmm(fim) }
      }
    }
  }
  return null
}

/**
 * Com que turnos já escolhidos é que este bate de frente.
 * `escolhidos` é { codigo: [turno, ...] }. Turnos da MESMA cadeira e do mesmo
 * tipo ficam de fora: escolher um substitui o outro, nunca coexistem.
 */
export function clashesFor(code, g, escolhidos, kind) {
  const mesmoTipo = kind
    ? new Set(turnosFor(code).find((x) => x.kind === kind)?.turnos.map((x) => x.g) || [])
    : new Set()
  const out = []
  for (const [outroCode, lista] of Object.entries(escolhidos || {})) {
    for (const outroG of lista || []) {
      if (outroCode === String(code) && (outroG === g || mesmoTipo.has(outroG))) continue
      const c = turnoClash(code, g, outroCode, outroG)
      if (c) out.push({ code: outroCode, g: outroG, name: SCHEDULES[outroCode]?.name || outroCode, ...c })
    }
  }
  return out
}

/** Todas as sobreposições de uma escolha completa, sem repetir pares. */
export function allClashes(escolhidos) {
  const pares = []
  const entradas = Object.entries(escolhidos || {}).flatMap(([code, lista]) =>
    (lista || []).map((g) => ({ code, g })))
  for (let i = 0; i < entradas.length; i++) {
    for (let j = i + 1; j < entradas.length; j++) {
      const a = entradas[i]; const b = entradas[j]
      const c = turnoClash(a.code, a.g, b.code, b.g)
      if (c) {
        pares.push({
          a: { ...a, name: SCHEDULES[a.code]?.name || a.code },
          b: { ...b, name: SCHEDULES[b.code]?.name || b.code },
          ...c,
        })
      }
    }
  }
  return pares
}
