import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useT } from '../i18n/index.jsx'
import { PageHeader, Icon, Spinner, EmptyState, ErrorBox } from '../components/ui.jsx'
import { errorText } from '../lib/errors.js'
import { formatDateTime } from '../lib/helpers.js'
import { listFeedback, setFeedbackStatus, isAdmin } from '../lib/feedback.js'

const STATUS_TONE = {
  novo: 'bg-nova-500/20 text-nova-200 border-nova-500/30',
  visto: 'bg-amber-500/15 text-amber-200 border-amber-500/25',
  resolvido: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
}
const GRAVIDADE_TONE = {
  alta: 'text-rose-300',
  media: 'text-amber-300',
  baixa: 'text-slate-400',
}
const KIND_ICON = { bug: 'bug', melhoria: 'spark', outro: 'chat' }

/**
 * As mensagens enviadas pela aba de feedback.
 *
 * O mesmo ecrã serve os dois casos, porque é a RLS que decide o que chega cá:
 * quem administra recebe todas as linhas (e pode mudar-lhes o estado), toda a
 * gente recebe só as suas. Ver supabase/feedback.sql.
 */
export default function Feedback() {
  const { user, lang } = useAuth()
  const { t } = useT()
  const admin = isAdmin(user)

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [aberta, setAberta] = useState(null)
  const [filtro, setFiltro] = useState('novo')   // novo | todas

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listFeedback())
      setError(null)
    } catch (e) {
      setError(errorText(e, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { carregar() }, [carregar])

  async function mudarEstado(row, status) {
    // Otimista: a lista muda já, e volta atrás se o servidor recusar.
    const antes = rows
    setRows(rows.map((r) => (r.id === row.id ? { ...r, status } : r)))
    try {
      await setFeedbackStatus(row.id, status)
    } catch (e) {
      setRows(antes)
      setError(errorText(e, t))
    }
  }

  const visiveis = admin && filtro === 'novo'
    ? rows.filter((r) => r.status !== 'resolvido')
    : rows
  const porResolver = rows.filter((r) => r.status !== 'resolvido').length

  return (
    <div>
      <PageHeader
        title={t('feedback.inboxTitle')}
        subtitle={admin ? t('feedback.inboxSubtitleAdmin', { n: porResolver }) : t('feedback.inboxSubtitleMine')} />

      <ErrorBox error={error} onClose={() => setError(null)} className="mb-4" />

      {admin && (
        <div className="flex gap-2 mb-4">
          {[['novo', t('feedback.filterOpen')], ['todas', t('feedback.filterAll')]].map(([v, label]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                filtro === v ? 'bg-nova-500/20 text-nova-100 border-nova-500/30'
                             : 'text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/5'
              }`}>{label}</button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : visiveis.length === 0 ? (
        <EmptyState icon="chat" title={t('feedback.emptyTitle')} hint={t('feedback.emptyHint')} />
      ) : (
        <div className="space-y-2.5">
          {visiveis.map((r) => {
            const aberto = aberta === r.id
            const tri = r.triage || null
            return (
              <div key={r.id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
                <button onClick={() => setAberta(aberto ? null : r.id)}
                  className="w-full p-3.5 flex items-start gap-3 text-left">
                  <span className="mt-0.5 w-9 h-9 shrink-0 rounded-xl bg-white/[0.06] border border-white/10 text-nova-300 flex items-center justify-center">
                    <Icon name={KIND_ICON[r.kind] || 'chat'} className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 line-clamp-2">
                      {tri?.titulo || r.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {admin && r.user_email ? <>{r.user_email} · </> : null}
                      {formatDateTime(r.created_at, lang)}
                      {tri && <> · <span className={GRAVIDADE_TONE[tri.gravidade] || ''}>{t(`feedback.severity.${tri.gravidade}`)}</span></>}
                    </p>
                  </div>
                  <span className={`chip border ${STATUS_TONE[r.status] || STATUS_TONE.novo}`}>
                    {t(`feedback.status.${r.status}`)}
                  </span>
                </button>

                {aberto && (
                  <div className="border-t border-white/10 p-3.5 bg-white/[0.02] space-y-4">
                    <div>
                      <Rotulo>{t('feedback.theMessage')}</Rotulo>
                      <p className="text-sm text-slate-200 whitespace-pre-wrap">{r.message}</p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {t('feedback.context', { page: r.page || '?' })}
                        {r.app_version && <> · {t('feedback.version', { v: r.app_version })}</>}
                      </p>
                    </div>

                    {/* A triagem é trabalho interno: quem escreveu o report não
                        precisa de ver o palpite do modelo sobre o próprio bug. */}
                    {admin && tri && (
                      <div className="rounded-xl bg-nova-500/[0.07] border border-nova-500/20 p-3.5 space-y-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-nova-300 flex items-center gap-1.5">
                          <Icon name="spark" className="w-3.5 h-3.5" />{t('feedback.triage')}
                        </p>
                        <Campo titulo={t('feedback.triageSummary')}>{tri.resumo}</Campo>
                        <Campo titulo={t('feedback.triageCause')}>{tri.causa_provavel}</Campo>
                        {tri.ficheiros?.length > 0 && (
                          <div>
                            <Rotulo>{t('feedback.triageFiles')}</Rotulo>
                            <ul className="text-sm text-slate-300 space-y-0.5">
                              {tri.ficheiros.map((f) => (
                                <li key={f} className="font-mono text-[12px] text-nova-200">{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Campo titulo={t('feedback.triageFix')}>{tri.sugestao}</Campo>
                        {tri.perguntar?.length > 0 && (
                          <div>
                            <Rotulo>{t('feedback.triageAsk')}</Rotulo>
                            <ul className="text-sm text-slate-300 list-disc pl-5 space-y-0.5">
                              {tri.perguntar.map((q) => <li key={q}>{q}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {admin && (
                      <div className="flex gap-2">
                        {['novo', 'visto', 'resolvido'].map((s) => (
                          <button key={s} onClick={() => mudarEstado(r, s)} disabled={r.status === s}
                            className={`flex-1 py-2 seg text-xs ${r.status === s ? 'seg-on' : 'seg-off'}`}>
                            {t(`feedback.status.${s}`)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const Rotulo = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{children}</p>
)

const Campo = ({ titulo, children }) => (
  <div>
    <Rotulo>{titulo}</Rotulo>
    <p className="text-sm text-slate-200 whitespace-pre-wrap">{children}</p>
  </div>
)
