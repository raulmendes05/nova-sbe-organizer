// ============================================================
//  Plano de estudo — o que fazer em cada semana.
//
//  Vive na tabela `notes`, que ficou livre quando as "Notas & Tarefas"
//  passaram para os Prazos. Sem colunas novas: o `body` traz um marcador que
//  diz o que a linha e.
//
//    tarefa do plano   is_task = true    body = "#plano:2026-09-07"
//                      (a data e a segunda-feira da semana)
//    resumo de slides  is_task = false   body = "#resumo:aula3.pptx\n<texto>"
//
//  O useNotesMerge (que arruma as notas antigas nos Prazos) salta estas
//  linhas — ver a funcao `daPlanoOuResumo` la.
// ============================================================
import { mondayOf, isoOf } from './week.js'

export const PLAN_TAG = '#plano:'
export const SUMMARY_TAG = '#resumo:'

/** A chave de uma semana: a segunda-feira, em ISO. */
export const weekKeyOf = (base = new Date(), offset = 0) => isoOf(mondayOf(base, offset))

export const planBody = (semana) => `${PLAN_TAG}${semana}`
export const isPlanRow = (n) => String(n?.body || '').startsWith(PLAN_TAG)
export const planWeek = (n) =>
  isPlanRow(n) ? String(n.body).slice(PLAN_TAG.length).split('\n')[0].trim() : null

export const summaryBody = (nome, texto) => `${SUMMARY_TAG}${nome}\n${texto}`
export const isSummaryRow = (n) => String(n?.body || '').startsWith(SUMMARY_TAG)
export function summaryOf(n) {
  const body = String(n?.body || '')
  const corte = body.indexOf('\n')
  const cabeca = (corte === -1 ? body : body.slice(0, corte)).slice(SUMMARY_TAG.length)
  return { nome: cabeca.trim(), texto: corte === -1 ? '' : body.slice(corte + 1) }
}

/** Linhas do plano de uma semana, mais antigas primeiro. */
export const planOfWeek = (rows, semana) =>
  (rows || []).filter((n) => planWeek(n) === semana)

/** Os sete dias de uma semana, do primeiro ao ultimo, em ISO. */
export function weekBounds(semana) {
  const [y, m, d] = semana.split('-').map(Number)
  const seg = new Date(y, m - 1, d)
  const dom = new Date(y, m - 1, d + 6)
  return { inicio: isoOf(seg), fim: isoOf(dom), segunda: seg, domingo: dom }
}

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
export const normTitulo = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(DIACRITICS, '').replace(/\s+/g, ' ').trim()

const diasEntre = (isoA, isoB) => {
  const [ay, am, ad] = isoA.split('-').map(Number)
  const [by, bm, bd] = isoB.split('-').map(Number)
  return Math.round((new Date(by, bm - 1, bd) - new Date(ay, am - 1, ad)) / 86400000)
}

// Quanto tempo antes de uma prova e que faz sentido ja aparecer no plano.
const HORIZONTE_EXAME = 21
const HORIZONTE_PRAZO = 14

/**
 * O que ha para fazer nesta semana, a partir do que a app ja sabe: prazos por
 * entregar e provas a chegar. Nao grava nada — sao propostas, e o aluno e que
 * decide o que entra no plano.
 *
 * `jaNoPlano` traz os titulos que ele ja escolheu, para nao os propor de novo.
 */
export function suggestions({ semana, assignments = [], exames = [], courses = [], jaNoPlano = [], t }) {
  const { inicio, fim } = weekBounds(semana)
  const feitos = new Set(jaNoPlano.map(normTitulo))
  const porNome = Object.fromEntries((courses || []).map((c) => [normTitulo(c.name), c.id]))
  const out = []

  for (const a of assignments) {
    if (!a.due_date || a.status === 'done') continue
    const dia = String(a.due_date).slice(0, 10)
    const faltam = diasEntre(inicio, dia)
    if (dia < inicio && a.status !== 'done') {
      // ja passou: so vale a pena lembrar na semana em que estamos
      if (diasEntre(dia, inicio) > 7) continue
    } else if (faltam > HORIZONTE_PRAZO) continue
    const desta = dia >= inicio && dia <= fim
    out.push({
      id: `p:${a.id}`,
      titulo: t(desta ? 'plan.sugDeliver' : 'plan.sugAhead', { o: a.title }),
      course_id: a.course_id || null,
      quando: dia,
      urgente: desta || dia < inicio,
      tipo: 'prazo',
    })
  }

  for (const e of exames) {
    const faltam = diasEntre(inicio, e.date)
    if (faltam < 0 || faltam > HORIZONTE_EXAME) continue
    out.push({
      id: `e:${e.course}:${e.date}:${e.type}`,
      titulo: t('plan.sugStudy', { tipo: t(`examType.${e.type}`), cadeira: e.course }),
      course_id: porNome[normTitulo(e.course)] || null,
      quando: e.date,
      urgente: e.date >= inicio && e.date <= fim,
      tipo: 'exame',
    })
  }

  return out
    .filter((s) => !feitos.has(normTitulo(s.titulo)))
    .sort((a, b) => (a.quando < b.quando ? -1 : a.quando > b.quando ? 1 : 0))
}
