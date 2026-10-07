/**
 * O que vem no URL quando se volta de um link do email.
 *
 * O link de recuperacao da palavra-passe traz a sessao no fragmento
 * (#access_token=...&type=recovery); quando ja expirou traz em vez disso
 * #error=access_denied&error_code=otp_expired. O cliente do Supabase trata
 * disso e LIMPA o URL (history.replaceState) assim que o faz — por isso isto
 * le-se uma vez so, no arranque, antes de qualquer render.
 *
 * E a rede de seguranca do evento PASSWORD_RECOVERY: se o evento se perder
 * (um subscritor registado tarde, uma recarga da pagina), o aluno ficava com a
 * sessao aberta e sem ninguem lhe pedir a palavra-passe nova.
 */
function ler() {
  if (typeof window === 'undefined') return new URLSearchParams()
  const p = new URLSearchParams(window.location.search.replace(/^\?/, ''))
  // O fragmento manda: e onde o GoTrue poe a resposta do link.
  for (const [k, v] of new URLSearchParams(window.location.hash.replace(/^#/, ''))) p.set(k, v)
  return p
}

const params = ler()

export const urlRecovery = params.get('type') === 'recovery'

// A mensagem do servidor, nos campos por que ela pode vir. Fica em bruto: quem
// a mostra passa-a pelo errorText() para sair traduzida.
export const urlAuthError = params.get('error_description')
  || params.get('error_code')
  || params.get('error')
  || ''
