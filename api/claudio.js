// Função serverless (Vercel) — POST /api/claudio
// A chave vive em process.env.GEMINI_API_KEY (variável de ambiente na Vercel).
//
// Responde em NDJSON: uma linha de JSON por evento, à medida que o modelo
// escreve. Escolhido em vez de SSE por ser trivial de produzir e de ler — o
// cliente parte o corpo por \n e faz JSON.parse de cada linha.
import { streamClaudio, MODEL_CHAIN } from './_core.js'
import { exigirSessao } from './_auth.js'
import { exigirQuota, guardaDeModelos, todosEsgotados, responderEsgotado, enviarQuota } from './_limite.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' })
    return
  }
  // Só alunos com sessão: sem isto qualquer pessoa gastava a quota do Gemini.
  const sessao = await exigirSessao(req, res)
  if (!sessao) return

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })
    return
  }

  const { messages, context, lang } = req.body || {}

  // A app já gastou a quota gratuita de hoje em todos os modelos? Diz já.
  if (todosEsgotados(MODEL_CHAIN)) { responderEsgotado(res); return }

  // Limite diário por aluno: conta MENSAGENS do aluno. Quando o Cláudio usa uma
  // ferramenta (criar tarefa, procurar no caderno...), o browser volta a chamar
  // com o resultado — essa volta não é uma mensagem nova e não conta aqui. As
  // chamadas ao Gemini contam todas, uma a uma, na parte do aluno de cada
  // modelo e no tecto da app (o guarda, mais abaixo).
  if (!eVoltaDeFerramenta(messages)) {
    if (!(await exigirQuota(sessao, 'claudio', res))) return
  }
  const guarda = guardaDeModelos(sessao.sb)
  let started = false

  try {
    for await (const event of streamClaudio({ messages, context, apiKey: key, lang, guarda })) {
      if (!started) {
        started = true
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
        // Sem cache e sem transformação: qualquer proxy que junte os pedaços
        // desfaz o streaming e a espera volta a ser toda no fim.
        res.setHeader('Cache-Control', 'no-cache, no-store, no-transform')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders?.()
      }
      res.write(JSON.stringify(event) + '\n')
    }
    res.end()
  } catch (e) {
    const message = e?.message || 'Erro inesperado.'
    // Se ainda não saiu nada, dá para responder com um 500 limpo. Se já saiu,
    // os cabeçalhos foram enviados: o erro segue como mais um evento.
    if (!started && e?.quota) enviarQuota(res, e.quota)   // sem quota: 429 com o porquê
    else if (!started) res.status(500).json({ error: message })
    else {
      res.write(JSON.stringify({ type: 'error', error: message }) + '\n')
      res.end()
    }
  }
}

// A última mensagem é só o resultado de ferramentas (a continuação automática
// de uma resposta), e não algo que o aluno escreveu?
export function eVoltaDeFerramenta(messages) {
  const ultima = Array.isArray(messages) ? messages[messages.length - 1] : null
  if (!ultima || ultima.role !== 'user' || !Array.isArray(ultima.content) || !ultima.content.length) return false
  return ultima.content.every((b) => b?.type === 'tool_result')
}
