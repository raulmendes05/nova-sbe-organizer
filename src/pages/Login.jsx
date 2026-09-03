import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Icon } from '../components/ui.jsx'
import { useT } from '../i18n/index.jsx'
import { errorText } from '../lib/errors.js'

// Tem de acompanhar o trigger trg_enforce_nova_email em supabase/exams.sql.
// O servidor continua a ser quem manda; isto so serve para o aluno perceber
// porque foi recusado — o GoTrue mascara os erros de trigger com um
// "Database error saving new user" que nao explica nada.
const ALLOWED_DOMAINS = ['novasbe.pt', 'novasbe.unl.pt']

export default function Login() {
  const { t } = useT()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const domain = email.split('@')[1]?.toLowerCase() || ''
        if (!ALLOWED_DOMAINS.includes(domain)) {
          throw new Error(t('login.errDomain', { domains: ALLOWED_DOMAINS.map((d) => `@${d}`).join(', ') }))
        }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMsg({ tone: 'ok', text: t('login.created') })
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // O AuthContext trata do resto (onAuthStateChange).
      }
    } catch (err) {
      setMsg({ tone: 'err', text: errorText(err, t) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gradient-to-b from-nova-800 to-nova-900 text-white">
      <div className="max-w-sm w-full mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <span className="text-2xl font-black tracking-tight">N</span>
          </div>
          <h1 className="text-2xl font-bold">Nova SBE Organizer</h1>
          <p className="text-nova-200 text-sm mt-1">{t('login.tagline')}</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm text-nova-100">{t('profile.email')}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 rounded-xl bg-white/10 border border-white/20 px-3.5 py-3 outline-none focus:border-white/60 placeholder-nova-200"
              placeholder={t('login.emailPlaceholder')} />
          </div>
          <div>
            <label className="text-sm text-nova-100">{t('login.password')}</label>
            {/* Escrever uma password as cegas num teclado de telemovel e como
                se erra — e aqui um erro custa uma tentativa de login inteira.
                pr-12 deixa o texto passar por baixo do botao. */}
            <div className="relative mt-1">
              <input type={verSenha ? 'text' : 'password'} required minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/20 pl-3.5 pr-12 py-3 outline-none focus:border-white/60 placeholder-nova-200"
                placeholder={t('login.passwordHint')} />
              <button type="button" onClick={() => setVerSenha(!verSenha)}
                aria-pressed={verSenha}
                aria-label={t(verSenha ? 'login.hidePassword' : 'login.showPassword')}
                title={t(verSenha ? 'login.hidePassword' : 'login.showPassword')}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-nova-200 hover:text-white hover:bg-white/10 transition">
                <Icon name={verSenha ? 'eyeOff' : 'eye'} className="w-5 h-5" />
              </button>
            </div>
          </div>

          {msg && (
            <p className={`text-sm rounded-lg px-3 py-2 ${msg.tone === 'ok' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>
              {msg.text}
            </p>
          )}

          <button disabled={loading}
            className="w-full rounded-xl bg-white text-nova-800 font-bold py-3 active:scale-[0.98] transition disabled:opacity-60">
            {loading ? t('login.wait') : mode === 'signin' ? t('login.signIn') : t('login.signUp')}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(null); setVerSenha(false) }}
          className="w-full text-center text-sm text-nova-200 mt-5">
          {mode === 'signin' ? t('login.toSignUp') : t('login.toSignIn')}
        </button>
      </div>
    </div>
  )
}
