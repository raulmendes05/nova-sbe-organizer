// Função serverless (Vercel) — POST /api/upload
//
// Caminho alternativo para pôr um PDF no R2 quando o envio direto do browser
// não passa (o bucket ainda sem política de CORS). Aqui o ficheiro atravessa a
// função, e por isso vale só até ~3 MB: a Vercel corta o corpo aos 4,5 MB e o
// base64 cresce um terço.
import { guardarNoR2 } from './_r2.js'

const MAX_BASE64 = 4 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método não permitido' }); return }
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer /i, '')
    const { file, mime, nome } = req.body || {}
    if (typeof file !== 'string' || !file) { res.status(400).json({ error: 'Não veio nenhum ficheiro.' }); return }
    if (file.length > MAX_BASE64) {
      res.status(413).json({ error: 'Ficheiro demasiado grande para este caminho (máx. ~3 MB).' })
      return
    }
    const out = await guardarNoR2({
      token, fileName: nome, contentType: mime || 'application/pdf', bytes: Buffer.from(file, 'base64'),
    })
    res.status(200).json(out)
  } catch (e) {
    const msg = e?.message || 'Erro inesperado.'
    const auth = /sessão|Sessão|permissão/.test(msg)
    res.status(auth ? 403 : 500).json({ error: msg })
  }
}
