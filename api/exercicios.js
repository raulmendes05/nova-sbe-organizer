// Função serverless (Vercel) — POST /api/exercicios
//
// Lê o PDF de um caderno de exercícios (que o browser já pôs no R2, porque
// estes ficheiros passam facilmente dos 4,5 MB que a Vercel aceita no corpo) e
// devolve o ÍNDICE: capítulos e exercícios, cada um com uma linha a dizer do
// que trata.
//
// Só o índice, de propósito: os enunciados por extenso e as resoluções ficam
// no PDF, que é onde já estão bem. O que a app precisa é de saber que
// exercícios existem, para o aluno marcar o que já fez.
import { GoogleGenAI } from '@google/genai'
import { lerDoR2 } from './_r2.js'

const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
]
const TIMEOUT_MS = 55_000
const MAX_PDF = 18 * 1024 * 1024   // limite do pedido para o Gemini

const IDIOMA = {
  pt: 'Escreve em português de Portugal, com a acentuação toda no sítio.',
  en: 'Write in English.',
}

// Dois passos, e não um: um caderno de 200 páginas não cabe numa resposta só
// (medido: 55 s e ainda truncado, com a Vercel a cortar aos 60). Primeiro
// pergunta-se só que capítulos existem e em que páginas — resposta curta,
// rápida — e depois um capítulo de cada vez.
const IDIOMA_LINHA = (lang) => IDIOMA[lang === 'en' ? 'en' : 'pt']

const PROMPT_INDICE = `Recebes o caderno de exercícios de uma cadeira. Diz-me só que capítulos (ou secções de exercícios) existem e em que páginas do PDF começam e acabam.

{IDIOMA}

- "capitulos": pela ordem do documento, com o "titulo" tal como aparece e as páginas "inicio" e "fim" (numeração do PDF, a começar em 1).
- Conta só as partes com exercícios propostos. Deixa de fora índices, prefácios, formulários e as secções de soluções.
- Se o caderno não tiver capítulos, devolve um só, com o documento todo.
- Não listes exercícios nenhuns aqui.`

const SCHEMA_INDICE = {
  type: 'object',
  properties: {
    capitulos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          inicio: { type: 'integer' },
          fim: { type: 'integer' },
        },
        required: ['titulo', 'inicio', 'fim'],
      },
    },
  },
  required: ['capitulos'],
}

const PROMPT_CAPITULO = `Recebes o caderno de exercícios de uma cadeira. Olha SÓ para as páginas {INICIO} a {FIM} — o capítulo "{TITULO}" — e lista os exercícios propostos que lá estão.

{IDIOMA}

- Cada exercício leva o "n" — o número tal como está impresso ("1.4", "3", "II.2") — e um "assunto": UMA linha curta (no máximo 100 caracteres) a dizer do que trata, para o aluno o reconhecer sem abrir o PDF. Ex.: "Derivada de um produto com regra da cadeia".
- Não transcrevas o enunciado todo, não resolvas nada e não inventes exercícios que não existam.
- Se um exercício tiver alíneas (a), b), c)), conta como UM exercício.
- Ignora exercícios resolvidos a título de exemplo: queres os que ficam para o aluno fazer.`

const SCHEMA_CAPITULO = {
  type: 'object',
  properties: {
    exercicios: {
      type: 'array',
      items: {
        type: 'object',
        properties: { n: { type: 'string' }, assunto: { type: 'string' } },
        required: ['n', 'assunto'],
      },
    },
  },
  required: ['exercicios'],
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

  const { path, cadeira, lang, modo, capitulo } = req.body || {}
  if (!path) { res.status(400).json({ error: 'Falta o ficheiro.' }); return }
  const soIndice = modo !== 'capitulo'
  if (!soIndice && (!capitulo?.titulo || !capitulo?.inicio)) {
    res.status(400).json({ error: 'Falta o capítulo a ler.' })
    return
  }

  let pdf
  try {
    pdf = await lerDoR2(path)
  } catch (e) {
    res.status(400).json({ error: `Não consegui abrir o ficheiro: ${e.message}` })
    return
  }
  if (pdf.length > MAX_PDF) {
    res.status(413).json({ error: 'O PDF é grande de mais. Envia só a parte dos exercícios.' })
    return
  }

  const prompt = soIndice
    ? PROMPT_INDICE.replace('{IDIOMA}', IDIOMA_LINHA(lang))
    : PROMPT_CAPITULO
      .replace('{IDIOMA}', IDIOMA_LINHA(lang))
      .replace('{INICIO}', String(capitulo.inicio))
      .replace('{FIM}', String(capitulo.fim || capitulo.inicio))
      .replace('{TITULO}', String(capitulo.titulo))

  const partes = [{ text: prompt }]
  if (cadeira) partes.push({ text: `Cadeira: ${cadeira}` })
  partes.push({ inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } })

  const ai = new GoogleGenAI({ apiKey: key })
  let last
  for (const model of MODELS) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
    try {
      const base = {
        responseMimeType: 'application/json',
        responseSchema: soIndice ? SCHEMA_INDICE : SCHEMA_CAPITULO,
        maxOutputTokens: 16384,
        abortSignal: ac.signal,
      }
      const pedido = { model, contents: [{ role: 'user', parts: partes }] }
      // Sem "thinking": isto é copiar uma lista, não raciocinar. Medido no
      // caderno de 217 páginas: 181 s com, 33 s sem — e a Vercel corta aos 60.
      // Nem todos os modelos aceitam o parâmetro; os que não aceitam dão 400 e
      // repete-se sem ele.
      let out
      try {
        out = await ai.models.generateContent({
          ...pedido, config: { ...base, thinkingConfig: { thinkingBudget: 0 } },
        })
      } catch (e) {
        if ((e?.status ?? e?.code) !== 400) throw e
        out = await ai.models.generateContent({ ...pedido, config: base })
      }
      const lido = JSON.parse(out.text)
      if (soIndice) {
        res.status(200).json({
          capitulos: (lido.capitulos || []).map((c) => ({
            titulo: String(c.titulo || '').trim() || 'Exercícios',
            inicio: Number(c.inicio) || 1,
            fim: Number(c.fim) || Number(c.inicio) || 1,
          })).filter((c) => c.titulo).slice(0, 40),
          modelo: model,
        })
      } else {
        res.status(200).json({
          exercicios: (lido.exercicios || []).map((e) => ({
            n: String(e.n || '').trim(),
            assunto: String(e.assunto || '').trim().slice(0, 140),
          })).filter((e) => e.n).slice(0, 200),
          modelo: model,
        })
      }
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
      : `Não consegui ler os exercícios deste PDF. ${last?.message || ''}`.trim(),
  })
}
