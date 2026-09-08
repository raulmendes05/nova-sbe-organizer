// ============================================================
//  Em que metade do semestre corre cada cadeira.
//
//  Ethics, Business Principles, Law, Human Behaviour... nao correm o semestre
//  inteiro: correm so num trimestre. Uns alunos tem-nas no T1, outros no T2 —
//  aulas em semanas diferentes e exames em datas diferentes.
//
//  O que decide e o TURNO em que o aluno se inscreveu, e isso ja esta escrito
//  no titulo do bloco do horario: "Ethics — TPC (T2)". Sem horario, so a
//  grelha oficial ajuda: se a cadeira so existe num trimestre, e esse.
//
//  ATENCAO ao `term` da tabela `courses`: esse e o SEMESTRE (1 ou 2), nao o
//  trimestre. Confundir os dois foi o que punha o exame de Etica do T1 a
//  aparecer a quem a tem no T2.
// ============================================================
import { SCHEDULES } from '../data/schedules.js'
import { PERIODS } from '../data/calendar.js'
import { termOfTitle, isoOf } from './week.js'

// O mesmo separador que o resto da app usa entre o nome e o turno.
const SEP = /\s+[—–]\s+|\s+-\s+/
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(DIACRITICS, '').trim()
const nameOfTitle = (title) => norm(String(title || '').split(SEP)[0])

/** So os trimestres tem etiqueta: 'S1' e o normal e nao vale a pena mostrar. */
export const isHalf = (term) => term === 'T1' || term === 'T2' || term === 'T3' || term === 'T4'

/**
 * O trimestre que a grelha oficial da a esta cadeira, quando e so um.
 * Serve para quem ainda nao inscreveu os turnos no horario.
 */
export function catalogTerm(code) {
  const sessions = SCHEDULES[String(code)]?.sessions || []
  if (!sessions.length) return null
  const terms = new Set(sessions.map((s) => s.t))
  return terms.size === 1 ? [...terms][0] : null
}

/**
 * O trimestre que sai do turno INSCRITO no horario: e a unica fonte que prova
 * que o aluno anda mesmo nesta cadeira, e em que metade do semestre.
 * null quando nao ha blocos desta cadeira no horario.
 *
 * Compara pelo nome alem do id porque o course_id dos blocos costuma vir
 * vazio — e a mesma regra que o week.js ja usa para colar prazos as aulas.
 */
export function enrolledTerm(course, blocks = []) {
  if (!course) return null
  const nome = norm(course.name)
  const meus = (blocks || []).filter((b) =>
    (b.course_id && course.id && b.course_id === course.id) ||
    (nome && nameOfTitle(b.title) === nome))
  const terms = new Set(meus.map((b) => termOfTitle(b.title)))
  // Inscrito nas duas metades (raro, mas possivel): corre o semestre todo.
  if (terms.size > 1) return 'S1'
  return terms.size === 1 ? [...terms][0] : null
}

/**
 * A metade do semestre em que o ALUNO tem esta cadeira: 'T1', 'T2' ou 'S1'
 * (semestre inteiro). O turno inscrito manda; sem horario, so a grelha
 * oficial ajuda. null quando nao ha como saber.
 */
export const courseTerm = (course, blocks = []) =>
  enrolledTerm(course, blocks) ?? catalogTerm(course?.code)

/** As cadeiras com o trimestre em que o aluno as tem, em `half`. */
export const withTerms = (courses, blocks) =>
  (courses || []).map((c) => ({ ...c, half: courseTerm(c, blocks) }))

/**
 * Onde estamos face a este trimestre: 'antes' (ainda nao comecou), 'agora'
 * (esta a decorrer) ou 'depois' (ja acabou). null para 'S1' e desconhecidos.
 */
export function termStatus(term, iso = isoOf(new Date())) {
  if (!isHalf(term)) return null
  const p = PERIODS.find((x) => x.key === term)
  if (!p) return null
  if (iso < p.start) return 'antes'
  if (iso > p.end) return 'depois'
  return 'agora'
}

/** As datas de aulas de um trimestre ({ start, end }), da grelha do ano. */
export const termRange = (term) => {
  const p = isHalf(term) ? PERIODS.find((x) => x.key === term) : null
  return p ? { start: p.start, end: p.end } : null
}
