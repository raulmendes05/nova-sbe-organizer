import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Se as variaveis ainda nao estiverem configuradas, a app avisa em vez de rebentar.
export const isConfigured = Boolean(url && anonKey)

/**
 * O auth-js trata qualquer 5xx como avaria de rede e, em vez de ler o corpo da
 * resposta, faz JSON.stringify ao proprio Response — que nao tem campos
 * enumeraveis e da a mensagem literal "{}" (NETWORK_ERROR_CODES em
 * auth-js/lib/fetch.js). E o que acontece quando um trigger da base de dados
 * recusa o registo: o Postgres devolve 500 com a explicacao no corpo e ela era
 * deitada fora. Aqui lemos o corpo primeiro e relancamos com a mensagem real.
 *
 * So mexe nas rotas /auth/v1/ — o postgrest ja le os corpos de erro como deve ser.
 */
async function fetchComMotivo(input, init) {
  const res = await fetch(input, init)
  const alvo = String(typeof input === 'string' ? input : input?.url || '')
  if (res.ok || res.status < 500 || !alvo.includes('/auth/v1/')) return res

  let motivo = ''
  try {
    const body = await res.clone().json()
    motivo = [body?.msg, body?.message, body?.error_description, body?.error]
      .find((v) => typeof v === 'string' && v.trim()) || ''
  } catch { /* corpo vazio ou HTML (gateway em baixo) — deixa seguir como estava */ }
  if (!motivo) return res

  const err = new Error(motivo)
  err.status = res.status
  throw err
}

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { fetch: fetchComMotivo },
    })
  : null
