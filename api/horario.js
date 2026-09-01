// Função serverless (Vercel) — POST /api/horario
//
// Recebe uma captura de ecrã do horário do NETPA e devolve as cadeiras e os
// turnos que lá aparecem, já validados contra a grelha oficial de
// src/data/schedules.js. Nada é gravado aqui: o aluno confirma no ecrã antes
// de a app criar as cadeiras e os blocos.
//
// A chave vive em process.env.GEMINI_API_KEY (a mesma do Cláudio).
import { GoogleGenAI } from '@google/genai'
import { SCHEDULES, DAY_PT } from '../src/data/schedules.js'

const MODELS = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-latest']
const MAX_IMAGE_BYTES = 6 * 1024 * 1024   // a Vercel corta o corpo aos ~4.5 MB
const TIMEOUT_MS = 60_000

// Catálogo em texto: código, nome e turnos que existem mesmo. Serve de coleira
// ao modelo — só pode devolver turnos que estejam nesta lista.
function catalogo() {
  return Object.entries(SCHEDULES).map(([code, c]) => {
    const turnos = [...new Set(c.sessions.map((s) => s.g))]
    if (!turnos.length) return `${code} | ${c.name} | (sem turnos)`
    const quando = turnos.map((g) => {
      const ses = c.sessions.filter((s) => s.g === g)
      return `${g} [${ses.map((s) => `${DAY_PT[s.d]} ${s.s}`).join(', ')}]`
    })
    return `${code} | ${c.name} | ${quando.join(' ; ')}`
  }).join('\n')
}

const PROMPT = `Recebes a captura de ecrã do horário de um aluno da Nova SBE (NETPA/Inforestudante).

Identifica as cadeiras em que ele está inscrito e, para cada uma, os turnos.

Catálogo oficial — código | nome | turnos que existem (dia e hora de início):
{CATALOGO}

Regras:
- Devolve APENAS códigos e turnos que existam no catálogo acima, escritos exatamente como lá estão.
- O nome no NETPA pode estar abreviado ou em português; faz corresponder pelo sentido e confirma com o dia/hora do turno.
- Um turno começa por T (teórica), P (prática) ou TP. Um aluno costuma ter uma T e uma P por cadeira.
- Se leres uma cadeira que não consegues ligar ao catálogo, mete o texto que leste em "naoReconhecido".
- Se a imagem não for um horário, devolve as listas vazias.
- Não inventes. Em dúvida sobre um turno, deixa a lista de turnos vazia mas mantém a cadeira.`

const SCHEMA = {
  type: 'object',
  properties: {
    cadeiras: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          codigo: { type: 'string' },
          turnos: { type: 'array', items: { type: 'string' } },
        },
        required: ['codigo', 'turnos'],
      },
    },
    naoReconhecido: { type: 'array', items: { type: 'string' } },
  },
  required: ['cadeiras', 'naoReconhecido'],
}

const isTransient = (e) => {
  const status = e?.status ?? e?.code
  if ([429, 500, 503, 504].includes(status)) return true
  if (e?.name === 'AbortError' || e?.name === 'TimeoutError') return true
  return /UNAVAILABLE|high demand|overloaded|fetch failed|ECONNRESET/i.test(String(e?.message || ''))
}

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

  const { image, mime } = req.body || {}
  if (typeof image !== 'string' || !image) {
    res.status(400).json({ error: 'Falta a imagem do horário.' })
    return
  }
  if (image.length > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: 'A imagem é demasiado grande. Corta só a parte do horário e tenta outra vez.' })
    return
  }

  const contents = [{
    role: 'user',
    parts: [
      { inlineData: { mimeType: mime || 'image/jpeg', data: image } },
      { text: PROMPT.replace('{CATALOGO}', catalogo()) },
    ],
  }]

  const ai = new GoogleGenAI({ apiKey: key })
  let last
  for (const model of MODELS) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS)
    try {
      const out = await ai.models.generateContent({
        model,
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          abortSignal: ac.signal,
        },
      })
      const lido = JSON.parse(out.text)

      // Segunda coleira, já do nosso lado: o modelo pode devolver um código ou
      // um turno que não existe, e isso nunca deve chegar ao horário do aluno.
      const cadeiras = []
      for (const c of lido.cadeiras || []) {
        const ficha = SCHEDULES[String(c.codigo)]
        if (!ficha) continue
        const existem = new Set(ficha.sessions.map((s) => s.g))
        cadeiras.push({
          codigo: String(c.codigo),
          nome: ficha.name,
          turnos: [...new Set((c.turnos || []).filter((g) => existem.has(g)))],
        })
      }
      res.status(200).json({ cadeiras, naoReconhecido: lido.naoReconhecido || [] })
      return
    } catch (e) {
      last = e
      if (!isTransient(e)) break
    } finally {
      clearTimeout(timer)
    }
  }
  res.status(502).json({
    error: `Não consegui ler o horário desta imagem. ${last?.message || ''}`.trim(),
  })
}
