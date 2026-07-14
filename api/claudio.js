// Função serverless (Vercel) — POST /api/claudio
// A chave vive em process.env.ANTHROPIC_API_KEY (variável de ambiente na Vercel).
import { runClaudio } from './_core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' })
    return
  }
  try {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })
      return
    }
    const { messages, context } = req.body || {}
    const result = await runClaudio({ messages, context, apiKey: key })
    res.status(200).json(result)
  } catch (e) {
    res.status(500).json({ error: e?.message || 'Erro inesperado.' })
  }
}
