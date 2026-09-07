// ============================================================
//  Testares-te a ti próprio, com repetição espaçada.
//
//  As cartas saem do que já está no caderno: os termos dos resumos (termo ->
//  definição) e as perguntas de exame com a resposta. Nada disto é escrito de
//  novo — é o material do aluno virado do avesso.
//
//  O agendamento é o de Leitner: acertar empurra a carta para mais longe,
//  falhar traz-la para o dia seguinte. Guarda-se uma linha por cadeira em
//  `notes` ("#revisao:<cadeira>"), com um JSON de chave -> { nivel, proxima },
//  para não ser uma escrita na base de dados por cada carta virada.
// ============================================================
import { isoOf } from './week.js'
import { isSummaryRow, summaryOf, REVIEW_TAG } from './plan.js'

/** Uma pergunta guardada pode ser texto (resumos antigos) ou {pergunta, resposta}. */
export const perguntaDe = (q) => (typeof q === 'string' ? { pergunta: q, resposta: null } : (q || {}))

// Dias até rever outra vez, por nível. Falhar volta ao nível 0.
const INTERVALOS = [1, 3, 7, 16, 35]
export const NIVEL_MAX = INTERVALOS.length - 1

const hojeIso = () => isoOf(new Date())
const maisDias = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

// A chave de uma carta tem de sobreviver a recarregar a página, mas não pode
// ser um id novo — as cartas não estão guardadas em lado nenhum, nascem do
// resumo. O próprio texto serve.
export const chaveDaCarta = (c) => `${c.tipo}:${c.frente.slice(0, 80)}`

/** As cartas de uma cadeira, a partir dos resumos guardados no caderno. */
export function cartasDe(rows, courseId) {
  const out = []
  for (const n of rows || []) {
    if (!isSummaryRow(n)) continue
    if (courseId ? n.course_id !== courseId : n.course_id) continue
    let dados
    try { dados = JSON.parse(summaryOf(n).texto) } catch { continue }
    for (const x of dados?.termos || []) {
      if (!x?.termo || !x?.definicao) continue
      out.push({ tipo: 'termo', frente: x.termo, verso: x.definicao, fonte: n.title })
    }
    for (const q of dados?.perguntas || []) {
      // Os resumos antigos guardaram as perguntas em texto simples, sem
      // resposta — sem resposta não há carta, seria virar para o vazio.
      if (typeof q === 'string' || !q?.resposta) continue
      out.push({ tipo: 'pergunta', frente: q.pergunta, verso: q.resposta, fonte: n.title })
    }
  }
  // Sem repetir o mesmo termo vindo de dois resumos.
  const vistas = new Set()
  return out.filter((c) => {
    const k = chaveDaCarta(c)
    if (vistas.has(k)) return false
    vistas.add(k)
    return true
  })
}

/** O estado da revisão de uma cadeira, tal como está guardado. */
export const linhaDeRevisao = (rows, courseId) =>
  (rows || []).find((n) => String(n.body || '').startsWith(REVIEW_TAG)
    && (courseId ? n.course_id === courseId : !n.course_id)) || null

export function estadoDe(rows, courseId) {
  const linha = linhaDeRevisao(rows, courseId)
  if (!linha) return {}
  try {
    const v = JSON.parse(String(linha.body).slice(REVIEW_TAG.length).split('\n').slice(1).join('\n'))
    return v && typeof v === 'object' ? v : {}
  } catch { return {} }
}

export const corpoDeRevisao = (estado) => `${REVIEW_TAG}\n${JSON.stringify(estado)}`

/** As cartas a rever hoje: as que nunca viu primeiro, depois as vencidas. */
export function paraHoje(cartas, estado, limite = 15) {
  const hoje = hojeIso()
  const novas = []
  const vencidas = []
  for (const c of cartas) {
    const e = estado[chaveDaCarta(c)]
    if (!e) novas.push(c)
    else if (String(e.proxima || '') <= hoje) vencidas.push({ c, e })
  }
  vencidas.sort((a, b) => String(a.e.proxima).localeCompare(String(b.e.proxima)))
  return [...novas, ...vencidas.map((x) => x.c)].slice(0, limite)
}

/** O estado depois de responder a uma carta. */
export function responder(estado, carta, acertou) {
  const k = chaveDaCarta(carta)
  const nivelAntigo = estado[k]?.nivel ?? -1
  const nivel = acertou ? Math.min(nivelAntigo + 1, NIVEL_MAX) : 0
  return { ...estado, [k]: { nivel, proxima: maisDias(INTERVALOS[nivel]) } }
}

/** Quantas cartas há, quantas para hoje e quando volta a haver. */
export function resumoDaRevisao(cartas, estado) {
  const hoje = hojeIso()
  let hojeN = 0
  let proxima = null
  for (const c of cartas) {
    const e = estado[chaveDaCarta(c)]
    if (!e || String(e.proxima || '') <= hoje) { hojeN++; continue }
    if (!proxima || e.proxima < proxima) proxima = e.proxima
  }
  return { total: cartas.length, hoje: hojeN, proxima }
}
