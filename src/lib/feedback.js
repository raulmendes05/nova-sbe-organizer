// ============================================================
//  Mensagens dos utilizadores — o lado do browser.
//
//  Enviar passa pela funcao serverless (/api/feedback) e nao direto para o
//  Supabase: e la que a mensagem e lida pelo Claudio e que sai o email. Ler e
//  que vai direto a tabela — as policias de RLS ja decidem quem ve o que.
// ============================================================
import { supabase } from './supabase.js'
import { postJson } from './api.js'

/**
 * Se esta sessao administra.
 *
 * Pergunta-se a base de dados em vez de comparar emails no cliente: a lista
 * de administradores (`public.admins`) nao e legivel por ninguem de fora, mas
 * a funcao is_admin() responde sobre quem esta a perguntar. Aqui so decide o
 * que aparece no ecra — quem manda mesmo, nas leituras e nas escritas, e o
 * RLS. Ver supabase/migrations/20261020203000_admins.sql.
 */
export async function amAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return false
  return Boolean(data)
}

export const KINDS = ['bug', 'melhoria', 'outro']
export const MAX_MESSAGE = 4000
export const MIN_MESSAGE = 5

/** Envia uma mensagem. Devolve { ok, id, triage, email }. */
export async function sendFeedback({ message, kind, page }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sem sessão. Volta a entrar e tenta outra vez.')

  // O getSession acima fica: o postJson tambem o faz, mas sem ele a falta de
  // sessao so se via no 403 do servidor, com uma frase mais seca.
  return postJson('/api/feedback', {
    message, kind, page,
    appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null,
    userAgent: navigator.userAgent,
  })
}

/** As mensagens que esta sessão pode ler: as minhas, ou todas se administro. */
export async function listFeedback({ limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('feedback').select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

/** Marcar como visto/resolvido — só quem administra passa pela RLS. */
export async function setFeedbackStatus(id, status) {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id)
  if (error) throw error
}
