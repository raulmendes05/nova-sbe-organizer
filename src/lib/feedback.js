// ============================================================
//  Mensagens dos utilizadores — o lado do browser.
//
//  Enviar passa pela funcao serverless (/api/feedback) e nao direto para o
//  Supabase: e la que a mensagem e lida pelo Claudio e que sai o email. Ler e
//  que vai direto a tabela — as policias de RLS ja decidem quem ve o que.
// ============================================================
import { supabase } from './supabase.js'
import { apiError } from './errors.js'

// Quem administra. Tem de ser o MESMO email da funcao is_admin() em
// supabase/feedback.sql — aqui so decide o que aparece no ecra; quem manda
// mesmo e a base de dados.
export const ADMIN_EMAIL = '75960@novasbe.pt'

export const isAdmin = (user) =>
  String(user?.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()

export const KINDS = ['bug', 'melhoria', 'outro']
export const MAX_MESSAGE = 4000
export const MIN_MESSAGE = 5

/** Envia uma mensagem. Devolve { ok, id, triage, email }. */
export async function sendFeedback({ message, kind, page }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Sem sessão. Volta a entrar e tenta outra vez.')

  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      message, kind, page,
      appVersion: typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null,
      userAgent: navigator.userAgent,
    }),
  })
  if (!res.ok) throw await apiError(res)
  return res.json()
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
