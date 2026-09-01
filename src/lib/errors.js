/**
 * Toda a mensagem de erro que a app mostra passa por aqui.
 *
 * O objetivo e nunca aparecer um erro mudo. O @supabase/auth-js, quando o
 * servidor responde com um corpo vazio, faz JSON.stringify a esse corpo e o
 * Error acaba com a mensagem literal "{}" (ver _getErrorMessage em
 * auth-js/lib/fetch.js) — foi esse "{}" que apareceu no ecra de criar conta,
 * sem qualquer pista do que estava mal. Aqui recusamos mensagens sem conteudo
 * e caimos para o que sobrar: codigo do erro, estado HTTP, nome do erro.
 */

// Strings que parecem mensagem mas nao dizem nada.
const NOISE = new Set([
  '', '{}', '[]', 'null', 'undefined', 'NaN', '[object Object]', 'Error', 'error',
])

function text(v) {
  if (typeof v !== 'string') return ''
  const s = v.trim()
  if (NOISE.has(s)) return ''
  // Uma "mensagem" que e so um bloco JSON vem sempre do JSON.stringify de
  // recurso do auth-js — ou seja, o servidor nao mandou mensagem nenhuma.
  if (s.startsWith('{') && s.endsWith('}')) return ''
  return s
}

/** A mensagem em bruto, venha de um Error, do Supabase (auth ou postgrest), de uma resposta /api ou de uma string solta. */
function rawMessage(err) {
  if (err == null) return ''
  if (typeof err !== 'object') return text(String(err))

  // Sem String(err) no fim de proposito: para um Error isso daria
  // "Error: {}", que e o ruido que estamos a tentar apagar.
  return [err.message, err.error_description, err.msg, err.error, err.details, err.hint, err.statusText]
    .map(text)
    .find(Boolean) || ''
}

/**
 * So quando nao ha mensagem NEM pista: despeja os campos do objeto para o
 * aluno ter alguma coisa concreta para copiar. Fica de fora o que ja e ruido
 * ({} de um Error, que nao tem campos enumeraveis).
 */
function dump(err) {
  if (!err || typeof err !== 'object') return ''
  try {
    const s = JSON.stringify(err)
    // Aqui o JSON e o conteudo, nao uma mensagem — nao passa pelo text().
    if (!s || NOISE.has(s)) return ''
    return s.length > 200 ? `${s.slice(0, 200)}...` : s
  } catch {
    return '' // referencias circulares
  }
}

/** Pista tecnica curta (HTTP 422 · weak_password) para o aluno poder reportar o que viu. */
function detail(err) {
  if (!err || typeof err !== 'object') return ''
  const bits = []
  const status = Number(err.status ?? err.statusCode)
  if (Number.isFinite(status) && status > 0) bits.push(`HTTP ${status}`)
  const code = text(err.code) || text(err.error_code)
  if (code) bits.push(code)
  if (!bits.length) {
    const name = text(err.name)
    if (name) bits.push(name)
  }
  return bits.join(' · ')
}

// As mensagens do Supabase vem sempre em ingles tecnico — traduzimos as que o
// aluno pode mesmo encontrar e deixamos passar as restantes (com a pista).
function known(haystack, t) {
  const s = haystack.toLowerCase()
  if (/invalid login|invalid_credentials/.test(s)) return t('login.errWrong')
  if (/already registered|already been registered|user_already_exists/.test(s)) return t('login.errExists')
  if (/rate limit|over_email_send_rate|too many requests/.test(s)) return t('login.errRate')
  if (/email_address_invalid|unable to validate email|invalid email/.test(s)) return t('login.errEmail')
  if (/weak_password|password should be|password is too/.test(s)) return t('login.errWeak')
  if (/signup_disabled|signups not allowed|not allowed for this instance/.test(s)) return t('login.errSignupsOff')
  if (/email_not_confirmed|email not confirmed/.test(s)) return t('login.errNotConfirmed')
  // O GoTrue mascara qualquer erro de trigger com este texto (ver o
  // trg_enforce_nova_email em supabase/exams.sql).
  if (/database error saving new user|unexpected_failure/.test(s)) return t('login.errRefused')
  return ''
}

function isNetwork(err, raw) {
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(raw)) return true
  // So sem mensagem nenhuma E sem estado HTTP: se o servidor respondeu (500),
  // houve rede. E um AuthRetryableFetchError pode trazer o motivo verdadeiro
  // vindo do fetchComMotivo — esse ganha sempre.
  return !raw && !Number(err?.status) && err?.name === 'AuthRetryableFetchError'
}

/**
 * Transforma qualquer erro numa frase que diz alguma coisa. Nunca devolve
 * vazio, "{}" nem "[object Object]".
 */
export function errorText(err, t) {
  const say = typeof t === 'function' ? t : (k) => k
  const raw = rawMessage(err)
  const pista = detail(err)

  const hit = known(`${raw} ${pista}`, say)
  if (hit) return hit
  if (isNetwork(err, raw)) return say('error.network')
  if (raw) return pista ? `${raw} (${pista})` : raw

  const extra = pista || dump(err)
  return extra ? `${say('error.empty')} (${extra})` : say('error.empty')
}

/**
 * Le a resposta de uma rota /api e devolve sempre um Error com mensagem.
 * Um 500 com corpo vazio deixa de ser "Erro do servidor." e passa a dizer
 * pelo menos o estado HTTP.
 */
export async function apiError(res, fallback) {
  let body = null
  try { body = await res.json() } catch { /* corpo vazio ou nao-JSON */ }
  const err = new Error(text(body?.error) || text(body?.message) || fallback || '')
  err.status = res.status
  if (text(body?.code)) err.code = body.code
  if (!err.message) err.message = ''
  return err
}
