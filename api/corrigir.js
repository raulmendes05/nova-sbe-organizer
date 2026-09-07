// Função serverless (Vercel) — POST /api/corrigir
//
// Recebe a fotografia da resolução de um exercício e devolve uma correção:
// onde está certo, onde falhou, e uma nota de 0 a 20.
//
// Quando o aluno tiver carregado o PDF das soluções, é POR ELE que se corrige —
// a solução do professor manda sobre a do modelo. Sem esse PDF, o modelo
// resolve o exercício e diz que o fez por si, para o aluno saber o que está a
// ler.
import { GoogleGenAI } from '@google/genai'
import { lerDoR2 } from './_r2.js'

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
]
const TIMEOUT_MS = 55_000
const MAX_IMAGENS = 4
const MAX_BYTES = 4 * 1024 * 1024
const MAX_PDF = 18 * 1024 * 1024

const IDIOMA = {
  pt: 'Escreve em português de Portugal, com a acentuação toda no sítio.',
  en: 'Write in English.',
}

const PROMPT = `Um aluno da Nova SBE resolveu um exercício à mão e fotografou a resolução. Corrige-a.

{IDIOMA}

Exercício: {EXERCICIO}
{FONTE}

O que tens de devolver:
- "nota": de 0 a 20, do trabalho que está na fotografia.
- "veredicto": "certo" se está tudo bem, "quase" se o método está certo mas há erros de contas ou passos em falta, "errado" se o caminho está mal.
- "feedback": 2 a 5 frases dirigidas ao aluno ("fizeste", "faltou-te"), a dizer o que correu bem e o que não.
- "erros": lista curta dos erros concretos, cada um com o "onde" (o passo) e o "porque". Vazia se não houver.
- "solucao": em 2 a 6 linhas, o caminho certo — os passos e o resultado final.

Como corrigir:
- Julga o RACIOCÍNIO, não a caligrafia nem a apresentação. Um resultado certo por um caminho errado não vale 20; um caminho certo com uma conta trocada não vale 0.
- Se a fotografia estiver ilegível ou não tiver resolução nenhuma, põe a nota a 0, o veredicto a "errado" e diz no feedback que não conseguiste ler — não inventes uma correção.
- Se o aluno chegar ao resultado certo por um caminho diferente do da solução oficial, isso está CERTO. Diz-lho.
- Não inventes erros para ter o que dizer. Se está bem, diz que está bem.`

const SCHEMA = {
  type: 'object',
  properties: {
    nota: { type: 'number' },
    veredicto: { type: 'string', enum: ['certo', 'quase', 'errado'] },
    feedback: { type: 'string' },
    erros: {
      type: 'array',
      items: {
        type: 'object',
        properties: { onde: { type: 'string' }, porque: { type: 'string' } },
        required: ['onde', 'porque'],
      },
    },
    solucao: { type: 'string' },
  },
  required: ['nota', 'veredicto', 'feedback', 'erros', 'solucao'],
}

const isTransient = (e) => {
  const status = e?.status ?? e?.code
  if ([429, 500, 503, 504].includes(status)) return true
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return true
  return /UNAVAILABLE|high demand|overloaded|fetch failed|ECONNRESET/i.test(String(e?.message || ''))
}
const isQuota = (e) =>
  (e?.status ?? e?.code) === 429 && /quota|free_tier|per day|limit: \d+/i.test(String(e?.message || ''))

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método não permitido' }); return }
  const key = process.env.GEMINI_API_KEY
  if (!key) { res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' }); return }

  const { imagens, mime, exercicio, capitulo, solucoesPath, paginas, cadeira, lang } = req.body || {}
  const fotos = (Array.isArray(imagens) ? imagens : []).filter((x) => typeof x === 'string' && x)
  if (!fotos.length) { res.status(400).json({ error: 'Não veio nenhuma fotografia.' }); return }
  if (fotos.length > MAX_IMAGENS) { res.status(400).json({ error: `Máximo de ${MAX_IMAGENS} fotografias.` }); return }
  if (fotos.reduce((s, x) => s + x.length, 0) > MAX_BYTES) {
    res.status(413).json({ error: 'As fotografias são demasiado grandes.' })
    return
  }

  // As soluções oficiais, se o aluno as tiver carregado.
  let solucoes = null
  if (solucoesPath) {
    try {
      const b = await lerDoR2(solucoesPath)
      if (b.length <= MAX_PDF) solucoes = b
    } catch { /* sem soluções: corrige-se pelo próprio modelo, e diz-se */ }
  }

  const onde = [
    capitulo ? `Capítulo: ${capitulo}` : '',
    paginas ? `A solução oficial deve estar por volta das páginas ${paginas} do PDF em anexo (ou na secção de soluções correspondente).` : '',
  ].filter(Boolean).join('\n')

  const fonte = solucoes
    ? `Vai buscar a solução oficial ao PDF em anexo e corrige por ela. ${onde}`.trim()
    : 'Não tens as soluções oficiais: resolve tu o exercício e corrige por aí. Diz no feedback que a correção é tua e não da folha de soluções do professor.'

  const partes = [{
    text: PROMPT
      .replace('{IDIOMA}', IDIOMA[lang === 'en' ? 'en' : 'pt'])
      .replace('{EXERCICIO}', String(exercicio || 'o que estiver na fotografia'))
      .replace('{FONTE}', fonte),
  }]
  if (cadeira) partes.push({ text: `Cadeira: ${cadeira}` })
  if (solucoes) partes.push({ inlineData: { mimeType: 'application/pdf', data: solucoes.toString('base64') } })
  partes.push({ text: 'A resolução do aluno:' })
  for (const data of fotos) partes.push({ inlineData: { mimeType: mime || 'image/jpeg', data } })

  const ai = new GoogleGenAI({ apiKey: key })
  let last
  for (const model of MODELS) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
    try {
      const out = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: partes }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          abortSignal: ac.signal,
        },
      })
      const lido = JSON.parse(out.text)
      const nota = Math.max(0, Math.min(20, Number(lido.nota) || 0))
      res.status(200).json({
        nota,
        veredicto: ['certo', 'quase', 'errado'].includes(lido.veredicto) ? lido.veredicto : 'quase',
        feedback: String(lido.feedback || '').trim(),
        erros: (lido.erros || []).slice(0, 6),
        solucao: String(lido.solucao || '').trim(),
        comSolucoes: Boolean(solucoes),
        modelo: model,
      })
      return
    } catch (e) {
      last = e
      if (!isTransient(e) && !isQuota(e)) break
    } finally {
      clearTimeout(timer)
    }
  }
  const quota = isQuota(last)
  res.status(quota ? 429 : 502).json({
    error: quota
      ? 'Os pedidos gratuitos de hoje acabaram. Tenta amanhã.'
      : `Não consegui corrigir esta fotografia. ${last?.message || ''}`.trim(),
  })
}
