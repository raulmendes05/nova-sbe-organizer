// ============================================================
//  Limite diário de pedidos de IA por aluno.
//
//  A quota gratuita do Gemini é partilhada por toda a gente (poucas dezenas
//  de pedidos por dia e por modelo). O _auth.js já garante que só alunos com
//  sessão chegam aqui; isto garante que nenhum deles, sozinho, a gasta toda.
//
//  O contador vive no Supabase (tabela ai_usage + função ai_usage_hit, ver
//  supabase/migrations/20261008120100_ai_usage_limit.sql) e é chamado com o
//  token do PRÓPRIO aluno — o servidor só tem a anon key, e é a base de dados
//  que tira o aluno do token. O dia é o de Lisboa: recomeça à meia-noite.
//
//  Regra que atravessa o ficheiro: **o limite nunca pode deitar a app abaixo**.
//  Se a tabela ainda não existir (código publicado antes do SQL) ou o
//  Supabase falhar, o pedido passa e fica um aviso no log.
// ============================================================

// Pedidos por aluno e por dia. Cada volta do Cláudio conta como um pedido —
// e uma pergunta que usa ferramentas (criar tarefa, procurar no caderno...)
// gasta duas ou três voltas. Os outros são mais pesados (PDFs e imagens
// inteiros), por isso mais baixos. Mudam-se na Vercel sem tocar no código:
// AI_LIMIT_CLAUDIO=60, AI_LIMIT_TOTAL=100, ... (0 = sem limite).
export const LIMITES_PADRAO = {
  claudio: 40,
  resumo: 10,
  apontamentos: 10,
  exercicios: 25,   // índice + capítulos + enunciados do mesmo caderno
  corrigir: 25,
  horario: 5,
}
// Tecto para a soma de tudo, num dia.
export const TOTAL_PADRAO = 60

function lerLimite(valor, padrao) {
  if (valor === undefined || valor === null || String(valor).trim() === '') return padrao
  const n = Number.parseInt(String(valor), 10)
  if (!Number.isFinite(n)) return padrao
  return n > 0 ? n : null   // 0 ou negativo = sem limite
}

/** Os limites em vigor para uma função, já com as variáveis de ambiente aplicadas. */
export function limitesDe(funcao, env = process.env) {
  return {
    limite: lerLimite(env[`AI_LIMIT_${funcao.toUpperCase()}`], LIMITES_PADRAO[funcao] ?? null),
    total: lerLimite(env.AI_LIMIT_TOTAL, TOTAL_PADRAO),
  }
}

// Segundos até à meia-noite de Lisboa (para o Retry-After).
export function segundosAteAmanha(agora = new Date()) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Lisbon', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(agora).map((p) => [p.type, p.value]))
  const passados = (Number(partes.hour) % 24) * 3600 + Number(partes.minute) * 60 + Number(partes.second)
  return Math.max(60, 86400 - passados)
}

const NOMES = {
  claudio: 'do Cláudio',
  resumo: 'de resumos de slides',
  apontamentos: 'de apontamentos por fotografia',
  exercicios: 'de leitura de cadernos de exercícios',
  corrigir: 'de correções de exercícios',
  horario: 'de leitura do horário',
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
    // PGRST202 = a função não existe (o SQL ainda não foi aplicado).
    const falta = e?.code === 'PGRST202' || e?.code === '42883' || e?.code === '42P01'
    console.warn(
      `[limite] ${falta ? 'ai_usage_hit ainda não existe no Supabase' : 'não consegui contar o pedido'}`
      + ` (${funcao}) — deixo passar.`, e?.code || '', e?.message || e,
    )
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
      : `Já fizeste os ${n} pedidos ${NOMES[funcao] || 'desta funcionalidade'} de hoje. O contador recomeça à meia-noite — volta amanhã.`,
    code: total ? 'ai_daily_limit_total' : 'ai_daily_limit',
    endpoint: funcao,
    limit: n,
  })
  return false
}
