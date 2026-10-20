// Função serverless (Vercel) — POST /api/upload
//
// Caminho alternativo para pôr um PDF no R2 quando o envio direto do browser
// não passa (o bucket ainda sem política de CORS). Aqui o ficheiro atravessa a
// função, e por isso vale só até ~3 MB: a Vercel corta o corpo aos 4,5 MB e o
// base64 cresce um terço.
import { guardarNoR2 } from './_r2.js'
import { exigirSessao } from './_auth.js'

// Travão barato, antes de descodificar: poupa o trabalho de transformar em
// bytes um corpo que já se sabe grande de mais. O limite a sério é o dos bytes
// descodificados, dentro do guardarNoR2 — este aqui só evita o esforço.
const MAX_BASE64 = 4 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método não permitido' }); return }
  // A sessao primeiro, antes de olhar sequer para o corpo: sem ela, um pedido
  // de fora nao chega a fazer o servidor descodificar megabytes de base64.
  if (!await exigirSessao(req, res)) return
  try {
    const { file } = req.body || {}
    if (typeof file !== 'string' || !file) { res.status(400).json({ error: 'Não veio nenhum ficheiro.' }); return }
    if (file.length > MAX_BASE64) {
      res.status(413).json({ error: 'Ficheiro demasiado grande para este caminho (máx. ~3 MB).' })
      return
    }
    // O `mime` e o `nome` que o cliente mandava deixaram de contar: o tipo sai
    // dos bytes e o nome é gerado pelo servidor.
    const out = await guardarNoR2({ bytes: Buffer.from(file, 'base64') })
    res.status(200).json(out)
  } catch (e) {
    const msg = e?.message || 'Erro inesperado.'
    const auth = /sessão|Sessão|permissão/.test(msg)
    res.status(e?.status || (auth ? 403 : 500)).json({ error: msg })
  }
}
