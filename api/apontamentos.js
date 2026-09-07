// Função serverless (Vercel) — POST /api/apontamentos
//
// Recebe fotografias de apontamentos escritos à mão (ou de um quadro, ou de
// páginas de um livro) e devolve-os passados a limpo: o mesmo conteúdo, em
// texto, organizado por secções.
//
// Não resume nem acrescenta matéria — o que não se percebe fica marcado como
// ilegível, para o aluno ir confirmar em vez de estudar por uma invenção.
//
// A chave vive em process.env.GEMINI_API_KEY (a mesma do Cláudio).
import { GoogleGenAI } from '@google/genai'

// A quota gratuita é por modelo: com a lista toda, um modelo esgotado não
// deixa a funcionalidade em baixo.
const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
]
const TIMEOUT_MS = 55_000
const MAX_IMAGENS = 6
const MAX_BYTES = 4 * 1024 * 1024   // a Vercel corta o corpo aos ~4,5 MB

const IDIOMA = {
  pt: 'Escreve em português de Portugal — a menos que os apontamentos estejam noutra língua, e nesse caso mantém a língua deles. Com a acentuação toda no sítio — nunca escrevas "nao", "sao" ou "materia" sem acento.',
  en: 'Write in English — unless the notes are in another language, in which case keep theirs.',
}

const PROMPT = `Recebes fotografias dos apontamentos de um aluno da Nova SBE (escritos à mão, de um quadro ou de um caderno). Passa-os a limpo.

{IDIOMA}

- "titulo": o assunto dos apontamentos, em 3 a 6 palavras.
- "texto": o MESMO conteúdo, em texto corrido e organizado. Usa linhas começadas por "## " para as secções e por "- " para as listas. Mantém a ordem em que está no papel.

Regras, por esta ordem de importância:
- Transcreve, não resumas. Não cortes passos de um raciocínio nem exemplos.
- Não acrescentes matéria que não esteja nas fotografias — nem definições, nem exemplos, nem fórmulas "que costumam vir a seguir".
- O que não conseguires ler escreve-se [ilegível]. Se for uma palavra que dá para adivinhar pelo contexto, escreve-a seguida de [?].
- Fórmulas: escreve-as em texto de forma legível (ex: "E = (ΔQ/Q) / (ΔP/P)"). Setas, chavetas e sublinhados viram texto ou listas.
- Junta as fotografias como se fossem páginas seguidas do mesmo caderno; não repitas o que aparecer em duas.
- Corrige gralhas óbvias e abre as abreviaturas do aluno quando forem claras (ex: "qtd" -> "quantidade").
- Se as fotografias não tiverem apontamentos nenhuns, devolve o título vazio e explica em duas linhas no texto.`

const SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    texto: { type: 'string' },
  },
  required: ['titulo', 'texto'],
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
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' })
    return
  }
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' })
    return
  }

  const { imagens, mime, cadeira, lang } = req.body || {}
  const fotos = (Array.isArray(imagens) ? imagens : []).filter((x) => typeof x === 'string' && x)
  if (!fotos.length) {
    res.status(400).json({ error: 'Não veio nenhuma fotografia.' })
    return
  }
  if (fotos.length > MAX_IMAGENS) {
    res.status(400).json({ error: `Máximo de ${MAX_IMAGENS} fotografias de cada vez.` })
    return
  }
  if (fotos.reduce((s, x) => s + x.length, 0) > MAX_BYTES) {
    res.status(413).json({ error: 'As fotografias são demasiado grandes. Envia menos de cada vez.' })
    return
  }

  const partes = [{ text: PROMPT.replace('{IDIOMA}', IDIOMA[lang === 'en' ? 'en' : 'pt']) }]
  if (cadeira) partes.push({ text: `Cadeira: ${cadeira}` })
  fotos.forEach((data, i) => {
    partes.push({ text: `Página ${i + 1}:` })
    partes.push({ inlineData: { mimeType: mime || 'image/jpeg', data } })
  })

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
      res.status(200).json({
        titulo: String(lido.titulo || '').trim(),
        texto: String(lido.texto || '').trim(),
        paginas: fotos.length,
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
      ? 'Os pedidos gratuitos de hoje acabaram. Tenta amanhã, ou volta a tentar daqui a bocado.'
      : `Não consegui ler estas fotografias. ${last?.message || ''}`.trim(),
  })
}
