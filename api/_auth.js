// ============================================================
//  Sessão do aluno nas funções serverless.
//
//  As funções de IA gastam a quota do Gemini, que é partilhada por toda a
//  gente (o plano gratuito dá poucas dezenas de pedidos por dia e por modelo).
//  Sem isto, qualquer pessoa na internet podia chamá-las e deixar os alunos
//  sem Cláudio. Aqui confirma-se, com o próprio Supabase, que o pedido traz
//  uma sessão válida — o token que o browser manda em "Authorization: Bearer".
// ============================================================
import { createClient } from '@supabase/supabase-js'

/** O token da sessão que veio no cabeçalho Authorization ("Bearer <token>"). */
export function tokenDoPedido(req) {
  return String(req?.headers?.authorization || '').replace(/^Bearer /i, '').trim()
}

// Cliente Supabase a agir *em nome do utilizador*: as policies de RLS
// aplicam-se na mesma, por isso e o proprio Postgres que autoriza.
export function userClient(token, env = process.env) {
  if (!token) throw new Error('Sem sessão.')
  const url = env.VITE_SUPABASE_URL
  const anon = env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase não configurado no servidor.')
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUser(sb) {
  const { data, error } = await sb.auth.getUser()
  if (error || !data?.user) throw new Error('Sessão inválida.')
  return data.user
}

/**
 * Para usar no início de cada função: devolve { sb, user } se o pedido traz
 * uma sessão válida. Se não traz, responde já 401 (ou 500 se o servidor não
 * estiver configurado) e devolve null — quem chama só tem de sair.
 */
export async function exigirSessao(req, res, env = process.env) {
  const token = tokenDoPedido(req)
  if (!token) {
    res.status(401).json({ error: 'Sem sessão. Volta a entrar e tenta outra vez.' })
    return null
  }
  try {
    const sb = userClient(token, env)
    const user = await requireUser(sb)
    return { sb, user }
  } catch (e) {
    const msg = e?.message || 'Erro inesperado.'
    if (/sessão|Sessão/.test(msg)) {
      res.status(401).json({ error: 'Sessão inválida ou expirada. Volta a entrar e tenta outra vez.' })
    } else {
      res.status(500).json({ error: msg })
    }
    return null
  }
}
