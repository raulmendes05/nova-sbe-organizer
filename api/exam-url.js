// Função serverless (Vercel) — POST /api/exam-url
// Devolve URLs assinados de curta duração para o bucket R2 das provas.
import { signExamUrl } from './_r2.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' })
    return
  }
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /i, '')
    const { action, path, courseCode, fileName, contentType, downloadAs } = req.body || {}
    const out = await signExamUrl({ token, action, path, courseCode, fileName, contentType, downloadAs })
    res.status(200).json(out)
  } catch (e) {
    const msg = e?.message || 'Erro inesperado.'
    const auth = /sessão|Sessão|permissão/.test(msg)
    res.status(auth ? 403 : 500).json({ error: msg })
  }
}
