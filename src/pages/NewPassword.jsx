import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon } from '../components/ui.jsx'
import { useT } from '../i18n/index.jsx'
import { errorText } from '../lib/errors.js'

const MIN = 6

/**
 * Fim da recuperacao: definir a palavra-passe nova.
 *
 * Chega-se aqui pelo link do email — o Supabase ja abriu a sessao, mas o aluno
 * continua sem saber a palavra-passe. Enquanto nao a definir, nao segue para a
 * app: se o deixassemos entrar, no dia seguinte estava outra vez de fora.
 *
 * Tem a cara do ecra de entrada de proposito — e a continuacao do mesmo
 * assunto, nao uma pagina da app.
 */
export default function NewPassword() {
  const { t } = useT()
  const { user, setPassword, signOut } = useAuth()
  const [password, setPwd] = useState('')
  const [repeticao, setRepeticao] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setMsg(null)
    // As duas verificacoes antes de ir ao servidor: sao as duas que o aluno
    // erra, e nenhuma delas vale uma ida a rede.
    if (password.length < MIN) return setMsg({ tone: 'err', text: t('login.errWeak') })
    if (password !== repeticao) return setMsg({ tone: 'err', text: t('newpass.errMatch') })
    setLoading(true)
    try {
      await setPassword(password)
      // Sem mensagem de sucesso: sair do modo de recuperacao ja mostra a app, e
      // e essa a prova de que funcionou.
    } catch (err) {
      setMsg({ tone: 'err', text: errorText(err, t) })
    } finally {
      setLoading(false)
    }
  }

  const campo = (label, valor, onChange, autoComplete) => (
    <div>
      <label className="text-sm text-nova-100">{label}</label>
      <div className="relative mt-1">
        <input type={verSenha ? 'text' : 'password'} required minLength={MIN}
          autoComplete={autoComplete} value={valor} onChange={(e) => onChange(e.target.value)}
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
  )

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-gradient-to-b from-nova-800 to-nova-900 text-white">
      <div className="max-w-sm w-full mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <Icon name="lock" className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">{t('newpass.title')}</h1>
          <p className="text-nova-200 text-sm mt-1">{user?.email || t('newpass.hint')}</p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {campo(t('newpass.field'), password, setPwd, 'new-password')}
          {campo(t('newpass.confirm'), repeticao, setRepeticao, 'new-password')}

          {msg && (
            <p role="alert" className={`text-sm rounded-lg px-3 py-2 ${msg.tone === 'ok' ? 'bg-emerald-500/20 text-emerald-100' : 'bg-rose-500/20 text-rose-100'}`}>
              {msg.text}
            </p>
          )}

          <button disabled={loading}
            className="w-full rounded-xl bg-white text-nova-800 font-bold py-3 active:scale-[0.98] transition disabled:opacity-60">
            {loading ? t('login.wait') : t('newpass.save')}
          </button>
        </form>

        {/* Saida de emergencia: um link velho pode abrir uma sessao que nao
            serve para nada, e sem isto o aluno ficava encurralado neste ecra. */}
        <button onClick={() => signOut()} className="w-full text-center text-sm text-nova-200 mt-5">
          {t('newpass.signOut')}
        </button>
      </div>
    </div>
  )
}
