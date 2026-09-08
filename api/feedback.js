// Função serverless (Vercel) — POST /api/feedback
// Recebe uma mensagem do utilizador (bug ou sugestão), pede ao Cláudio uma
// leitura técnica do problema, grava-a no Supabase e avisa o administrador
// por email. Ver api/_feedback.js.
import { submitFeedback } from './_feedback.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' })
    return
  }
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /i, '')
    const out = await submitFeedback({ token, body: req.body || {} })
    res.status(200).json(out)
  } catch (e) {
    const msg = e?.message || 'Erro inesperado.'
    // Sessão em falta é 403; uma mensagem mal formada é culpa do pedido, não
    // do servidor — sem isto tudo aparecia como "erro do servidor" ao aluno.
    const auth = /sessão|Sessão/.test(msg)
    const pedido = /demasiado longa|bocadinho mais|bastantes mensagens/.test(msg)
    res.status(auth ? 403 : pedido ? 400 : 500).json({ error: msg })
  }
}
