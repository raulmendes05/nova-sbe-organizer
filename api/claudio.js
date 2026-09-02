// Função serverless (Vercel) — POST /api/claudio
// A chave vive em process.env.GEMINI_API_KEY (variável de ambiente na Vercel).
//
// Responde em NDJSON: uma linha de JSON por evento, à medida que o modelo
// escreve. Escolhido em vez de SSE por ser trivial de produzir e de ler — o
// cliente parte o corpo por \n e faz JSON.parse de cada linha.
import { streamClaudio } from './_core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' })
    return
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })
    return
  }

  const { messages, context, lang } = req.body || {}
  let started = false

  try {
    for await (const event of streamClaudio({ messages, context, apiKey: key, lang })) {
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
    if (!started) res.status(500).json({ error: message })
    else {
      res.write(JSON.stringify({ type: 'error', error: message }) + '\n')
      res.end()
    }
  }
}
