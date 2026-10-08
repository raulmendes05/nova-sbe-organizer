// ============================================================
//  Limites de pedidos de IA.
//
//  A app está no plano GRATUITO do Gemini: cada modelo dá ~20 pedidos por
//  dia (os "lite" ~500) para o projeto inteiro, partilhados por todos os
//  alunos, e o dia da Google recomeça à meia-noite do Pacífico (08:00 em
//  Lisboa na maior parte do ano). Há duas camadas:
//
//  1. Limite POR ALUNO (o controlo principal). Números pequenos, para que um
//     dia normal caiba na quota gratuita:
//       a) pedidos por funcionalidade e por dia de Lisboa (ai_usage_hit) —
//          no Cláudio conta cada MENSAGEM do aluno, não cada volta de
//          ferramenta;
//       b) a parte de cada modelo que um aluno pode gastar num dia da Google
//          (per_user_max em ai_model_limits) — é aqui que contam as voltas
//          de ferramenta do Cláudio e as tentativas repetidas.
//  2. Tecto DA APP por modelo (ai_model_hit), só como rede de segurança: a
//     quota real menos ~10%. Conta cada chamada ao Gemini, antes de a fazer,
//     porque a Google também conta as que falham.
//
//  O SQL está em supabase/migrations/20261008133723_ai_usage_limit.sql. As
//  funções são chamadas com o token do PRÓPRIO aluno (o servidor só tem a
//  anon key); a base de dados tira o aluno do token.
//
//  Regra que atravessa o ficheiro: **o limite nunca pode deitar a app abaixo**.
//  Se o SQL ainda não estiver aplicado ou o Supabase falhar, o pedido passa e
//  fica um aviso no log.
// ============================================================

// ---------------------------------------------------------------------------
//  1a. Pedidos por aluno, por funcionalidade, por dia (meia-noite de Lisboa)
// ---------------------------------------------------------------------------
// Pensado para ~10 alunos ativos por dia caberem nos ~54 pedidos/dia dos
// modelos Flash (3 modelos x 18), com os "lite" a apanhar o resto.
// Mudam-se na Vercel: AI_LIMIT_CLAUDIO=15, AI_LIMIT_TOTAL=20, ... (0 = sem limite).
export const LIMITES_PADRAO = {
  claudio: 10,      // mensagens do aluno (as voltas de ferramenta não contam aqui)
  resumo: 2,        // slides/PDF inteiros: os mais pesados
  apontamentos: 2,
  exercicios: 5,    // índice + capítulos + enunciados do mesmo caderno
  corrigir: 3,      // só modelos Flash (sem "lite" de reserva)
  horario: 2,       // só se usa ao montar o horário; 2 para poder repetir
}
// Tecto para a soma de tudo, por aluno, num dia.
export const TOTAL_PADRAO = 15

// ---------------------------------------------------------------------------
//  2. Quota gratuita da Google, por modelo (= por "balde" da quota)
// ---------------------------------------------------------------------------
// Fonte: Google AI Studio / medições publicadas em set. 2026 (a Google deixou
// de publicar a tabela do plano gratuito em ai.google.dev/gemini-api/docs/rate-limits).
// Quotas por projeto e por modelo; o RPD recomeça à meia-noite do Pacífico.
// Os aliases "-latest" apontam para o modelo mais recente da família e gastam
// a quota DESSE modelo: gemini-flash-lite-latest conta-se com o 3.5 Flash-Lite
// (o mais recente dos lite), por cautela.
export const BALDE_DO_MODELO = {
  'gemini-3.5-flash': 'gemini-3.5-flash',
  'gemini-3.6-flash': 'gemini-3.6-flash',
  'gemini-flash-latest': 'gemini-flash-latest',
  'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest': 'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',
}
// Tecto da app = quota gratuita (RPD) menos ~10%. Rede de segurança: com os
// limites por aluno, num dia normal nem lá se chega.
// Mudam-se na Vercel: AI_GLOBAL_LIMIT_GEMINI_3_5_FLASH=20, ... (0 = desligado).
// Nunca passam do máximo gravado na tabela ai_model_limits (a quota real).
export const TECTO_GLOBAL_PADRAO = {
  'gemini-3.5-flash': 18,       // RPD 20
  'gemini-3.6-flash': 18,       // RPD 20
  'gemini-flash-latest': 18,    // RPD 20
  'gemini-3.5-flash-lite': 450, // RPD 500
  'gemini-3.1-flash-lite': 450, // RPD 500
}

function lerLimite(valor, padrao) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return padrao
  const n = Number.parseInt(String(valor), 10)
  if (!Number.isFinite(n)) return padrao
  return n > 0 ? n : null   // 0 ou negativo = sem limite
}

const nomeEnv = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]+/g, '_')

/** Os limites por aluno em vigor para uma função, já com as variáveis de ambiente aplicadas. */
export function limitesDe(funcao, env = process.env) {
  return {
    limite: lerLimite(env[`AI_LIMIT_${nomeEnv(funcao)}`], LIMITES_PADRAO[funcao] ?? null),
    total: lerLimite(env.AI_LIMIT_TOTAL, TOTAL_PADRAO),
  }
}

/** O tecto da app para um balde (null = desligado). */
export function tectoGlobalDe(balde, env = process.env) {
  return lerLimite(env[`AI_GLOBAL_LIMIT_${nomeEnv(balde)}`], TECTO_GLOBAL_PADRAO[balde] ?? null)
}

// ---------------------------------------------------------------------------
//  Horas
// ---------------------------------------------------------------------------
function partesEm(tz, d) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d).map((p) => [p.type, p.value]))
}

// Segundos até à meia-noite de Lisboa (Retry-After do limite por aluno).
export function segundosAteAmanha(agora = new Date()) {
  const p = partesEm('Europe/Lisbon', agora)
  const passados = (Number(p.hour) % 24) * 3600 + Number(p.minute) * 60 + Number(p.second)
  return Math.max(60, 86400 - passados)
}

/** O dia da Google (AAAA-MM-DD no fuso do Pacífico). */
export function diaPacifico(agora = new Date()) {
  const p = partesEm('America/Los_Angeles', agora)
  return `${p.year}-${p.month}-${p.day}`
}

/** Quando a quota da Google recomeça: a próxima meia-noite do Pacífico. */
export function proximoResetGoogle(agora = new Date()) {
  const p = partesEm('America/Los_Angeles', agora)
  // A meia-noite do Pacífico é às 07:00 ou 08:00 UTC, conforme a hora de verão.
  for (const h of [7, 8]) {
    const cand = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) + 1, h))
    const c = partesEm('America/Los_Angeles', cand)
    if (Number(c.hour) % 24 === 0) return cand
  }
  return new Date(agora.getTime() + 86400_000)
}

/** "08:00" — a hora de Lisboa a que a quota da Google recomeça. */
export function horaLisboa(d) {
  const p = partesEm('Europe/Lisbon', d)
  return `${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`
}

// ---------------------------------------------------------------------------
//  1a. Contar um pedido do aluno (ai_usage_hit)
// ---------------------------------------------------------------------------
const NOMES = {
  claudio: 'mensagens ao Cláudio',
  resumo: 'resumos de slides',
  apontamentos: 'apontamentos por fotografia',
  exercicios: 'leituras de cadernos de exercícios',
  corrigir: 'correções de exercícios',
  horario: 'leituras do horário',
}

function avisar(o_que, funcao, e) {
  // PGRST202 = a função não existe (o SQL ainda não foi aplicado).
  const falta = e?.code === 'PGRST202' || e?.code === '42883' || e?.code === '42P01'
  console.warn(
    `[limite] ${falta ? `${o_que} ainda não existe no Supabase` : `não consegui contar (${o_que})`}`
    + ` (${funcao}) — deixo passar.`, e?.code || '', e?.message || e,
  )
}

/**
 * Conta um pedido do aluno. Devolve { allowed, scope, used, total, limit,
 * total_limit } — ou { allowed: true, failOpen: true } se não deu para
 * contar (e então deixa passar).
 */
export async function contarPedido(sb, funcao, env = process.env) {
  const { limite, total } = limitesDe(funcao, env)
  if (limite === null && total === null) return { allowed: true, unlimited: true }
  try {
    const { data, error } = await sb.rpc('ai_usage_hit', {
      p_endpoint: funcao, p_limit: limite, p_total_limit: total,
    })
    if (error) throw error
    if (!data || typeof data.allowed !== 'boolean') throw new Error('resposta inesperada do ai_usage_hit')
    return data
  } catch (e) {
    avisar('ai_usage_hit', funcao, e)
    return { allowed: true, failOpen: true }
  }
}

/**
 * Para usar logo antes de chamar o Gemini, depois do exigirSessao. Devolve
 * true se o pedido pode seguir; se não, responde já 429 e devolve false.
 */
export async function exigirQuota(sessao, funcao, res, env = process.env) {
  const out = await contarPedido(sessao.sb, funcao, env)
  if (out.allowed) return true
  const total = out.scope === 'total'
  const n = total ? out.total_limit : out.limit
  res.setHeader?.('Retry-After', String(segundosAteAmanha()))
  res.status(429).json({
    // O cliente mostra a versão traduzida (error.aiLimit / error.aiLimitTotal,
    // pelo `code`); esta frase é para quem chame a API diretamente.
    error: total
      ? `Já fizeste os ${n} pedidos de IA de hoje. O contador recomeça à meia-noite — volta amanhã.`
      : `Já fizeste as ${n} ${NOMES[funcao] || 'utilizações desta funcionalidade'} de hoje. O contador recomeça à meia-noite — volta amanhã.`,
    code: total ? 'ai_daily_limit_total' : 'ai_daily_limit',
    endpoint: funcao,
    limit: n,
  })
  return false
}

// ---------------------------------------------------------------------------
//  1b + 2. Cada chamada ao Gemini: parte do aluno + tecto da app (ai_model_hit)
// ---------------------------------------------------------------------------
// Modelos que a Google disse estarem esgotados hoje (quota diária), nesta
// instância da função. Evita gastar pedidos a ouvir o mesmo "não" — e não pode
// ser abusado por ninguém, porque só a resposta da Google o preenche.
const esgotadosHoje = new Map()   // balde -> dia do Pacífico

const baldeDe = (model) => BALDE_DO_MODELO[model] || null

/** Só para testes: esquecer o que esta instância sabe sobre modelos esgotados. */
export function esquecerEsgotados() { esgotadosHoje.clear() }

function marcarEsgotado(balde) {
  if (balde) esgotadosHoje.set(balde, diaPacifico())
}
const estaEsgotado = (balde) => balde && esgotadosHoje.get(balde) === diaPacifico()

/** Os modelos desta lista estão todos esgotados hoje (pelo que esta instância sabe)? */
export function todosEsgotados(modelos) {
  return modelos.length > 0 && modelos.every((m) => estaEsgotado(baldeDe(m)))
}

/**
 * Que 429 é este? 'dia' = quota diária (só passa amanhã), 'minuto' = ritmo
 * (passa daqui a pouco), null = não é 429. A Google diz qual é no quotaId
 * (GenerateRequestsPerDayPerProjectPerModel-FreeTier / ...PerMinute...).
 */
export function tipoDe429(e) {
  const status = e?.status ?? e?.code
  const msg = String(e?.message || '')
  if (status !== 429 && !/RESOURCE_EXHAUSTED/.test(msg)) return null
  if (/PerDay|per day|requests_per_day/i.test(msg)) return 'dia'
  return 'minuto'
}

/**
 * Um "guarda" por pedido: pergunta à base de dados antes de cada chamada ao
 * Gemini e lembra-se do que aconteceu, para no fim se dar a resposta certa.
 *
 *   const guarda = guardaDeModelos(sessao.sb)
 *   for (const model of MODELS) {
 *     if (!(await guarda.reservar(model))) continue   // sem quota: o seguinte
 *     try { ... } catch (e) { guarda.falhou(model, e); ... }
 *   }
 *   if (guarda.responder(res, last)) return            // 429 com o porquê
 */
export function guardaDeModelos(sb, env = process.env) {
  const bloqueios = []   // { model, scope: 'global'|'user'|'google', resetsAt }
  let chamadas = 0
  let ultimo429 = null

  return {
    get chamadas() { return chamadas },
    get bloqueios() { return bloqueios },

    async reservar(model) {
      const balde = baldeDe(model)
      if (estaEsgotado(balde)) {
        bloqueios.push({ model, scope: 'google' })
        return false
      }
      const tecto = balde ? tectoGlobalDe(balde, env) : null
      if (!balde || tecto === null || !sb?.rpc) { chamadas++; return true }
      try {
        const { data, error } = await sb.rpc('ai_model_hit', { p_bucket: balde, p_global_limit: tecto })
        if (error) throw error
        if (!data || typeof data.allowed !== 'boolean') throw new Error('resposta inesperada do ai_model_hit')
        if (!data.allowed) {
          if (data.scope === 'global') marcarEsgotado(balde)
          bloqueios.push({ model, scope: data.scope, resetsAt: data.resets_at })
          return false
        }
      } catch (e) {
        avisar('ai_model_hit', model, e)
      }
      chamadas++
      return true
    },

    /** Registar o erro de uma chamada ao Gemini. */
    falhou(model, e) {
      const tipo = tipoDe429(e)
      if (!tipo) return
      ultimo429 = tipo
      if (tipo === 'dia') {
        marcarEsgotado(baldeDe(model))
        bloqueios.push({ model, scope: 'google' })
      }
    },

    /**
     * Se o pedido falhou por falta de quota, responde 429 com o motivo e
     * devolve true. Senão devolve false e quem chama dá o erro de sempre.
     */
    responder(res, last) {
      const r = respostaDeQuota({ bloqueios, chamadas, ultimo429, last })
      if (!r) return false
      enviarQuota(res, r)
      return true
    },

    /** O erro equivalente, para quem não tem `res` à mão (o stream do Cláudio). */
    erro(last) {
      const r = respostaDeQuota({ bloqueios, chamadas, ultimo429, last })
      if (!r) return null
      const err = new Error(r.body.error)
      err.quota = r
      return err
    },
  }
}

function respostaDeQuota({ bloqueios, chamadas, ultimo429, last }) {
  const ultimoTipo = tipoDe429(last)
  // Tudo bloqueado antes de chegar à Google, ou a última resposta da Google
  // foi "quota diária esgotada": acabou por hoje.
  const semNada = bloqueios.length > 0 && (chamadas === 0 || ultimoTipo === 'dia')
  if (semNada) {
    const reset = proximoResetGoogle()
    const hora = horaLisboa(reset)
    const soDoAluno = bloqueios.length > 0 && bloqueios.every((b) => b.scope === 'user')
    if (soDoAluno) {
      return {
        status: 429, retryAfter: Math.ceil((reset - Date.now()) / 1000),
        body: {
          error: `Já usaste a tua parte dos pedidos de IA de hoje (a quota gratuita é partilhada por todos). Volta a partir das ${hora} (hora de Lisboa).`,
          code: 'ai_user_share', resetsAt: reset.toISOString(), resetHour: hora,
        },
      }
    }
    return {
      status: 429, retryAfter: Math.ceil((reset - Date.now()) / 1000),
      body: {
        error: `O Cláudio e as outras funções de IA atingiram o limite diário da app (plano gratuito do Gemini). Volta a partir das ${hora} (hora de Lisboa).`,
        code: 'ai_global_limit', resetsAt: reset.toISOString(), resetHour: hora,
      },
    }
  }
  // A Google recusou por ritmo (pedidos a mais por minuto): passa já a seguir.
  if (ultimoTipo === 'minuto') {
    return {
      status: 429, retryAfter: 60,
      body: { error: 'Há muitos pedidos ao mesmo tempo. Espera um minuto e tenta outra vez.', code: 'ai_busy' },
    }
  }
  return null
}

export function enviarQuota(res, r) {
  res.setHeader?.('Retry-After', String(Math.max(1, r.retryAfter || 60)))
  res.status(r.status).json(r.body)
}

/** 429 "a app esgotou a quota de hoje" sem passar pela base de dados (atalho). */
export function responderEsgotado(res) {
  const reset = proximoResetGoogle()
  const hora = horaLisboa(reset)
  enviarQuota(res, {
    status: 429, retryAfter: Math.ceil((reset - Date.now()) / 1000),
    body: {
      error: `O Cláudio e as outras funções de IA atingiram o limite diário da app (plano gratuito do Gemini). Volta a partir das ${hora} (hora de Lisboa).`,
      code: 'ai_global_limit', resetsAt: reset.toISOString(), resetHour: hora,
    },
  })
}
