// ============================================================
//  Pedidos às funções /api que precisam de sessão.
//
//  As funções de IA (Cláudio, resumos, apontamentos, horário, exercícios,
//  correções) só respondem a alunos com sessão: o browser manda o token do
//  Supabase em "Authorization: Bearer". O getSession renova-o se estiver a
//  expirar, por isso pede-se sempre um fresco antes de cada pedido.
// ============================================================
import { supabase } from './supabase.js'

/** Cabeçalhos para um POST JSON a uma rota /api, já com o token da sessão. */
export async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = { 'Content-Type': 'application/json' }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  return headers
}
