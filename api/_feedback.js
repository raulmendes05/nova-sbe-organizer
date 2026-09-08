// ============================================================
//  Mensagens dos utilizadores — triagem e entrega
//
//  O caminho de uma mensagem: o browser manda o texto -> aqui le-se quem a
//  escreveu (pelo token da sessao), pede-se ao Gemini uma leitura tecnica do
//  problema, grava-se tudo numa linha da tabela `feedback` e envia-se um email
//  ao administrador com o report e a triagem ja feita.
//
//  Regra que atravessa o ficheiro: **a mensagem nunca se perde**. A triagem e
//  o email sao extras — se o Gemini estiver em baixo ou faltar a chave do
//  Resend, a linha e gravada na mesma e o aluno ve "enviado". O contrario
//  (perder o report por causa do email) seria trocar o essencial pelo enfeite.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { MODEL_CHAIN } from './_core.js'

const MAX_MESSAGE = 4000
const MIN_MESSAGE = 5
const KINDS = new Set(['bug', 'melhoria', 'outro'])

// Quantas mensagens uma pessoa pode mandar por hora. Nao e para travar quem
// tem muito que dizer — e para um dedo preso no botao nao encher a caixa.
const MAX_PER_HOUR = 8

// A triagem tem de caber no tempo da funcao (maxDuration 60s no vercel.json)
// com folga para gravar e enviar. Medido: 9-16s por report, e o modelo gasta a
// maior parte disso a "pensar". Com os 20s que aqui estavam antes, os reports
// mais compridos batiam no teto e chegavam sem triagem nenhuma.
const TRIAGE_TIMEOUT_MS = 35_000

// Estes modelos "pensam" antes de responder, e o raciocinio sai deste mesmo
// orcamento (e a mesma armadilha documentada no _core.js). Com 2048 o
// raciocinio comia-o todo e a resposta vinha vazia — a triagem falhava sempre.
const TRIAGE_MAX_TOKENS = 8192

const ADMIN_EMAIL = '75960@novasbe.pt'

// ---------------------------------------------------------------------------
//  Supabase em nome do utilizador — as policies de RLS continuam a decidir.
// ---------------------------------------------------------------------------
function userClient(token, env) {
  if (!token) throw new Error('Sem sessão.')
  const url = env.VITE_SUPABASE_URL
  const anon = env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase não configurado no servidor.')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// ---------------------------------------------------------------------------
//  Triagem: o que o Cláudio percebe do report
// ---------------------------------------------------------------------------
// O modelo devolve JSON e so JSON — e mais facil de mostrar no email e de
// guardar do que um texto corrido que depois havia que voltar a interpretar.
const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Uma linha, no máximo 70 caracteres, a dizer o problema.' },
    tipo: { type: 'string', enum: ['bug', 'melhoria', 'duvida', 'outro'] },
    gravidade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
    resumo: { type: 'string', description: 'O que o utilizador está mesmo a pedir, em 1-2 frases.' },
    causa_provavel: { type: 'string', description: 'A explicação técnica mais provável, dado o que se sabe da app.' },
    ficheiros: {
      type: 'array', items: { type: 'string' },
      description: 'Caminhos prováveis no repositório (ex: src/pages/Grades.jsx). Vazio se não der para saber.',
    },
    sugestao: { type: 'string', description: 'Como resolver, em passos concretos.' },
    perguntar: {
      type: 'array', items: { type: 'string' },
      description: 'O que falta saber para poder resolver. Vazio se não faltar nada.',
    },
  },
  required: ['titulo', 'tipo', 'gravidade', 'resumo', 'causa_provavel', 'sugestao'],
}

// O suficiente para o modelo situar o report sem lhe despejar o repositorio
// inteiro no contexto.
const APP_MAP = `A app é o "Nova SBE Organizer": React 18 + Vite + Tailwind, dados no Supabase, deploy na Vercel.

Ecrãs (src/pages/):
- Home.jsx (/) — média, aulas de hoje, próximos prazos e exames
- Schedule.jsx (/horario) — grelha semanal; ProximaAula.jsx (/proxima)
- Assignments.jsx (/prazos) — prazos e calendário de exames
- Grades.jsx (/notas) — cadeiras, componentes de avaliação, médias, ECTS
- StudyPlan.jsx (/estudo) — plano semanal e caderno
- Exams.jsx (/provas) — biblioteca de provas antigas (ficheiros no R2)
- Claudio.jsx (/claudio) — o assistente; Profile.jsx (/perfil); Onboarding.jsx

Dados (src/data/): curriculum.js (planos de curso), schedules.js (grelha de
turnos S1 26/27, com o trimestre de cada sessão no campo 't'), exams.js (datas de
exames), calendar.js (períodos T1/T2/T3/T4, feriados, compensações),
assessments.js (pesos do syllabus), cwi.js.

Lógica (src/lib/): week.js (que aulas correm em que dia), terms.js (em que
metade do semestre corre cada cadeira), enroll.js (turnos -> blocos do
horário), helpers.js (datas, médias), planner.js, plan.js.

Notas importantes:
- A escala de notas é 0-20. Créditos em ECTS.
- courses.term na base de dados é o SEMESTRE (1 ou 2). Os T1/T2/T3/T4 são
  METADES do semestre (trimestres) e vivem noutro sítio: no título do bloco do
  horário ("Ethics — TPC (T2)") e em src/lib/terms.js. Confundir os dois já deu
  bugs — desconfia sempre que um report falar de datas ou aulas erradas.
- Os textos do ecrã vêm de src/i18n/pt.js e en.js (chaves como 'home.avg').
  Um texto errado corrige-se lá, nos dois idiomas.`

/**
 * Le o report e devolve a triagem, ou null se nao der.
 *
 * Nunca lanca: um modelo em baixo nao pode impedir a mensagem de ser gravada.
 */
export async function triage({ kind, message, page, apiKey, userAgent }) {
  if (!apiKey) return null
  const ai = new GoogleGenAI({ apiKey })
  const prompt = [
    'És um programador que conhece esta app de trás para a frente. Chegou-te uma',
    'mensagem de um utilizador. Faz a triagem: percebe o que ele quer dizer (pode',
    'estar escrito à pressa, em calão ou misturando português e inglês), diz onde',
    'é provável que o problema esteja e como se resolve.',
    '',
    'Responde em português de Portugal. Sê concreto: nomeia ficheiros e funções em',
    'vez de dar conselhos genéricos. Se a mensagem for vaga demais para saber o que',
    'se passa, di-lo em `perguntar` em vez de inventares uma causa.',
    '',
    `# A app\n${APP_MAP}`,
    '',
    '# A mensagem',
    `Tipo escolhido pelo utilizador: ${kind}`,
    `Ecrã onde estava: ${page || 'desconhecido'}`,
    `Browser: ${userAgent || 'desconhecido'}`,
    `Texto: ${JSON.stringify(message)}`,
  ].join('\n')

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), TRIAGE_TIMEOUT_MS)
  try {
    for (const model of MODEL_CHAIN) {
      try {
        const out = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            abortSignal: ac.signal,
            responseMimeType: 'application/json',
            responseSchema: TRIAGE_SCHEMA,
            maxOutputTokens: TRIAGE_MAX_TOKENS,
          },
        })
        const texto = out?.text
        if (!texto) continue
        return { ...JSON.parse(texto), modelo: model }
      } catch {
        if (ac.signal.aborted) return null   // sem tempo: segue sem triagem
        // Modelo saturado ou sem quota — o proximo da lista que tente.
      }
    }
    return null
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
//  Email
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')

const GRAVIDADE = { alta: '#e11d48', media: '#f59e0b', baixa: '#64748b' }

function emailHtml({ row, t }) {
  const lista = (arr) => (arr || []).map((x) => `<li>${esc(x)}</li>`).join('')
  const bloco = (titulo, corpo) =>
    corpo ? `<h3 style="margin:20px 0 6px;font:600 13px system-ui;color:#64748b;text-transform:uppercase;letter-spacing:.05em">${titulo}</h3>${corpo}` : ''

  return `<div style="font:15px/1.6 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;max-width:640px">
  <p style="margin:0 0 4px;font-size:12px;color:#64748b">Nova SBE Organizer · mensagem nova</p>
  <h2 style="margin:0 0 2px;font-size:20px">${esc(t?.titulo || row.message.slice(0, 70))}</h2>
  <p style="margin:0 0 16px;font-size:13px;color:#64748b">
    ${esc(row.user_email || 'sem email')} · ${esc(row.kind)}${
      t ? ` · <span style="color:${GRAVIDADE[t.gravidade] || '#64748b'};font-weight:600">gravidade ${esc(t.gravidade)}</span>` : ''
    } · ecrã <code>${esc(row.page || '?')}</code>
  </p>

  <blockquote style="margin:0;padding:12px 16px;background:#f1f5f9;border-left:3px solid #3d78bf;border-radius:0 8px 8px 0;white-space:pre-wrap">${esc(row.message)}</blockquote>

  ${t ? `
  ${bloco('O que é', `<p style="margin:0">${esc(t.resumo)}</p>`)}
  ${bloco('Causa provável', `<p style="margin:0">${esc(t.causa_provavel)}</p>`)}
  ${bloco('Onde mexer', t.ficheiros?.length ? `<ul style="margin:0;padding-left:20px"><li><code>${t.ficheiros.map(esc).join('</code></li><li><code>')}</code></li></ul>` : '')}
  ${bloco('Como resolver', `<p style="margin:0;white-space:pre-wrap">${esc(t.sugestao)}</p>`)}
  ${bloco('Falta saber', t.perguntar?.length ? `<ul style="margin:0;padding-left:20px">${lista(t.perguntar)}</ul>` : '')}
  ` : '<p style="margin:20px 0 0;font-size:13px;color:#94a3b8">(Sem triagem automática desta vez.)</p>'}

  <hr style="margin:24px 0 8px;border:0;border-top:1px solid #e2e8f0">
  <p style="margin:0;font-size:12px;color:#94a3b8">
    ${esc(new Date(row.created_at || Date.now()).toLocaleString('pt-PT'))} ·
    versão ${esc(row.app_version || '?')} · ${esc(row.user_agent || '')}
  </p>
</div>`
}

function emailText({ row, t }) {
  // null = campo que nao existe neste report (sai da lista);
  // '' = linha em branco de propósito. Confundir os dois colava o texto todo.
  const linhas = [
    `De: ${row.user_email || 'sem email'}`,
    `Tipo: ${row.kind} · Ecrã: ${row.page || '?'}`,
    '',
    row.message,
  ]
  if (t) {
    linhas.push(
      '', `— TRIAGEM (${t.gravidade}) —`,
      t.resumo,
      '', `Causa provável: ${t.causa_provavel}`,
      t.ficheiros?.length ? `Ficheiros: ${t.ficheiros.join(', ')}` : null,
      '', `Como resolver: ${t.sugestao}`,
      t.perguntar?.length ? '' : null,
      t.perguntar?.length ? `Falta saber:\n- ${t.perguntar.join('\n- ')}` : null,
    )
  }
  return linhas.filter((x) => x !== null).join('\n')
}

/**
 * O email pronto a enviar. Separado do envio de proposito: assim da para o
 * ver sem gastar um email (ver .tmp-test / o teste do modulo).
 *
 * Tudo o que vem do utilizador passa pelo esc() — a mensagem e texto que
 * alguem escreveu, e vai parar dentro de HTML.
 */
export function renderEmail({ row, t }) {
  return {
    subject: `[${row.kind}] ${(t?.titulo || row.message).replace(/\s+/g, ' ').slice(0, 70)}`,
    html: emailHtml({ row, t }),
    text: emailText({ row, t }),
  }
}

/**
 * Envia o email ao administrador. Devolve o que aconteceu, sem nunca lancar:
 * um email que nao sai nao pode fazer o pedido todo falhar.
 */
export async function notify({ row, t, env = process.env }) {
  const key = env.RESEND_API_KEY
  if (!key) return { sent: false, reason: 'RESEND_API_KEY não configurada' }
  const to = env.FEEDBACK_TO || ADMIN_EMAIL
  // O remetente de teste do Resend só entrega na conta do próprio dono da
  // chave — chega para isto. Com domínio verificado, põe-se FEEDBACK_FROM.
  const from = env.FEEDBACK_FROM || 'Nova SBE Organizer <onboarding@resend.dev>'

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        // Responder ao email vai ter com quem escreveu, nao com o robô.
        reply_to: row.user_email || undefined,
        ...renderEmail({ row, t }),
      }),
    })
    if (!res.ok) {
      const corpo = await res.text().catch(() => '')
      return { sent: false, reason: `Resend ${res.status}: ${corpo.slice(0, 200)}` }
    }
    return { sent: true }
  } catch (e) {
    return { sent: false, reason: e?.message || 'falha de rede' }
  }
}

// ---------------------------------------------------------------------------
//  O pedido todo
// ---------------------------------------------------------------------------
export async function submitFeedback({ token, body, env = process.env }) {
  const sb = userClient(token, env)
  const { data: auth, error: authErr } = await sb.auth.getUser()
  if (authErr || !auth?.user) throw new Error('Sessão inválida.')
  const user = auth.user

  const message = String(body?.message || '').trim()
  if (message.length < MIN_MESSAGE) throw new Error('Escreve um bocadinho mais para eu perceber o que se passa.')
  if (message.length > MAX_MESSAGE) throw new Error(`A mensagem é demasiado longa (máximo ${MAX_MESSAGE} caracteres).`)
  const kind = KINDS.has(body?.kind) ? body.kind : 'bug'

  // Travao de spam. `head: true` conta sem trazer as linhas.
  const desdeUmaHora = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await sb
    .from('feedback').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', desdeUmaHora)
  if ((count || 0) >= MAX_PER_HOUR) {
    throw new Error('Já enviaste bastantes mensagens nesta hora. Dá-me tempo de as ler e volta daqui a pouco.')
  }

  const page = String(body?.page || '').slice(0, 120) || null
  const userAgent = String(body?.userAgent || '').slice(0, 400) || null

  // A triagem vem ANTES de gravar: assim a linha nasce completa e ninguem
  // precisa de poder reescrever um report ja enviado (ver feedback.sql).
  const t = await triage({ kind, message, page, userAgent, apiKey: env.GEMINI_API_KEY })

  const { data: row, error } = await sb.from('feedback').insert({
    user_id: user.id,
    user_email: user.email || null,
    kind, message, page,
    app_version: String(body?.appVersion || '').slice(0, 40) || null,
    user_agent: userAgent,
    triage: t,
  }).select().single()
  if (error) throw new Error(error.message || 'Não consegui guardar a mensagem.')

  const email = await notify({ row, t, env })

  // `email` e `triage` vao na resposta so para se ver o que correu bem — o
  // aluno ve sempre "enviado", porque a mensagem esta mesmo guardada.
  return { ok: true, id: row.id, triage: Boolean(t), email }
}
