// Função serverless (Vercel) — POST /api/resumo
//
// Recebe o texto de uma apresentação (o browser já leu o .pptx e mandou só o
// texto) ou um PDF, e devolve um resumo de estudo: as ideias principais, os
// termos a saber, perguntas para testar e tarefas para o plano da semana.
//
// Nada fica gravado aqui — a app é que decide o que guardar na conta do aluno.
// A chave vive em process.env.GEMINI_API_KEY (a mesma do Cláudio).
import { GoogleGenAI } from '@google/genai'

// A quota gratuita do Gemini é POR MODELO: com a lista toda, um dia mau num
// modelo não deixa a funcionalidade em baixo.
const MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
]
const TIMEOUT_MS = 55_000
const MAX_TEXTO = 180_000            // ~45 mil palavras: dá para um semestre de slides
const MAX_FICHEIRO = 4 * 1024 * 1024 // a Vercel corta o corpo aos ~4,5 MB

const IDIOMA = {
  pt: 'Escreve tudo em português de Portugal. Com a acentuação toda no sítio — nunca escrevas "nao", "sao" ou "materia" sem acento.',
  en: 'Write everything in English.',
}

const PROMPT = `És um explicador de matéria para um aluno de licenciatura da Nova SBE, que vai estudar por estes slides.

{IDIOMA}

Faz um resumo de ESTUDO, não um índice:
- "resumo": 2 a 4 frases que digam do que trata a aula e o que é preciso perceber dela.
- "topicos": as ideias principais pela ordem em que aparecem. Cada uma com um título curto e 2 a 5 pontos que EXPLIQUEM a ideia — não repitas o título por outras palavras, nem escrevas "o slide fala de X". Junta slides seguidos que sejam a mesma ideia. No máximo 8 tópicos.
- "termos": conceitos, fórmulas ou siglas que o aluno tem mesmo de saber, com uma definição de uma linha. No máximo 10, e só os que aparecem no material.
- "perguntas": 3 a 6 perguntas de exame sobre isto, do género que obriga a explicar e não a decorar. Cada uma leva a "resposta" — 2 a 4 frases, a resposta que davas tu, com o essencial para a pergunta valer nota. A resposta sai SÓ do material recebido.
- "tarefas": 2 a 5 coisas concretas para pôr no plano de estudo desta semana (ex: "Refazer os exercícios de elasticidade dos slides 12-18"). Frases curtas, começadas por um verbo.

Regras:
- Baseia-te SÓ no material recebido. Se algo não estiver lá, não inventes — nem exemplos, nem fórmulas, nem números.
- Se o material for curto ou tiver pouco conteúdo, devolve menos tópicos em vez de encher.
- Mantém em inglês os termos técnicos que estão em inglês no material.
- Nada de markdown nos textos: sem asteriscos, sem cardinais.`

const SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    resumo: { type: 'string' },
    topicos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          pontos: { type: 'array', items: { type: 'string' } },
        },
        required: ['titulo', 'pontos'],
      },
    },
    termos: {
      type: 'array',
      items: {
        type: 'object',
        properties: { termo: { type: 'string' }, definicao: { type: 'string' } },
        required: ['termo', 'definicao'],
      },
    },
    perguntas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { pergunta: { type: 'string' }, resposta: { type: 'string' } },
        required: ['pergunta', 'resposta'],
      },
    },
    tarefas: { type: 'array', items: { type: 'string' } },
  },
  required: ['titulo', 'resumo', 'topicos', 'termos', 'perguntas', 'tarefas'],
}

const isTransient = (e) => {
  const status = e?.status ?? e?.code
  if ([429, 500, 503, 504].includes(status)) return true
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return true
  return /UNAVAILABLE|high demand|overloaded|fetch failed|ECONNRESET/i.test(String(e?.message || ''))
}

// 429 de quota diária esgotada não passa com uma segunda tentativa no mesmo
// modelo — só mudando de modelo.
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

  const { texto, file, mime, nome, cadeira, lang } = req.body || {}
  const temTexto = typeof texto === 'string' && texto.trim().length > 40
  const temFicheiro = typeof file === 'string' && file.length > 0

  if (!temTexto && !temFicheiro) {
    res.status(400).json({ error: 'Não veio texto nenhum para resumir.' })
    return
  }
  if (temFicheiro && file.length > MAX_FICHEIRO) {
    res.status(413).json({ error: 'O ficheiro é demasiado grande. Envia-o em PowerPoint, ou divide-o.' })
    return
  }

  const cabecalho = [
    nome ? `Ficheiro: ${nome}` : '',
    cadeira ? `Cadeira: ${cadeira}` : '',
  ].filter(Boolean).join('\n')

  const partes = [{ text: PROMPT.replace('{IDIOMA}', IDIOMA[lang === 'en' ? 'en' : 'pt']) }]
  if (cabecalho) partes.push({ text: cabecalho })
  if (temFicheiro) partes.push({ inlineData: { mimeType: mime || 'application/pdf', data: file } })
  if (temTexto) partes.push({ text: `Material:\n${texto.slice(0, MAX_TEXTO)}` })

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
        titulo: String(lido.titulo || nome || '').trim(),
        resumo: String(lido.resumo || '').trim(),
        topicos: (lido.topicos || []).slice(0, 8),
        termos: (lido.termos || []).slice(0, 10),
        perguntas: (lido.perguntas || []).slice(0, 6),
        tarefas: (lido.tarefas || []).slice(0, 5),
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
      : `Não consegui resumir este material. ${last?.message || ''}`.trim(),
  })
}
