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

// "#plano:<semana>" ou "#plano:<semana>|<dia>|<minutos>" — o dia e a duracao
// vem do plano sugerido; uma tarefa escrita a mao pode nao os ter.
export const planBody = (semana, dia = null, minutos = null) =>
  `${PLAN_TAG}${[semana, dia || '', minutos || ''].join('|').replace(/\|+$/, '')}`
export const isPlanRow = (n) => String(n?.body || '').startsWith(PLAN_TAG)
const planParts = (n) =>
  isPlanRow(n) ? String(n.body).slice(PLAN_TAG.length).split('\n')[0].split('|') : []
export const planWeek = (n) => planParts(n)[0]?.trim() || null
export const planMeta = (n) => {
  const [, dia, minutos] = planParts(n)
  return { dia: dia?.trim() || null, minutos: Number(minutos) || null }
}

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

// ---------------------------------------------------------------------------
//  Caderno: apontamentos de uma cadeira.
//
//  Mesma tabela, outro marcador — "#apontamento:<titulo>\n<texto>". O texto e
//  escrito pelo aluno (ou transcrito de uma foto), por isso fica em texto
//  simples, ao contrario dos resumos, que sao JSON.
// ---------------------------------------------------------------------------
export const NOTE_TAG = '#apontamento:'
// O estado das revisões também mora aqui, mas não é conteúdo: ver lib/revisao.js.
export const REVIEW_TAG = '#revisao:'
export const isReviewRow = (n) => String(n?.body || '').startsWith(REVIEW_TAG)
// O caderno de exercícios também: ver lib/exercicios.js.
export const HANDBOOK_TAG = '#handbook:'
export const isHandbookRow = (n) => String(n?.body || '').startsWith(HANDBOOK_TAG)

export const noteBody = (titulo, texto) => `${NOTE_TAG}${titulo}\n${texto}`
export const isNoteRow = (n) => String(n?.body || '').startsWith(NOTE_TAG)
export function noteOf(n) {
  const body = String(n?.body || '')
  const corte = body.indexOf('\n')
  const cabeca = (corte === -1 ? body : body.slice(0, corte)).slice(NOTE_TAG.length)
  return { titulo: cabeca.trim(), texto: corte === -1 ? '' : body.slice(corte + 1) }
}

/** Tudo o que ha no caderno de uma cadeira, do mais recente para tras. */
export function notebookOf(rows, courseId) {
  return (rows || [])
    .filter((n) => (isNoteRow(n) || isSummaryRow(n)) && (courseId ? n.course_id === courseId : !n.course_id))
    .slice()
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
}
