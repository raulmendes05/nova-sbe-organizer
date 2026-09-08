import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Icon, Modal } from './ui.jsx'
import { useT } from '../i18n/index.jsx'
import { errorText } from '../lib/errors.js'
import { sendFeedback, KINDS, MAX_MESSAGE, MIN_MESSAGE } from '../lib/feedback.js'

const KIND_ICON = { bug: 'bug', melhoria: 'spark', outro: 'chat' }

/**
 * A aba de mensagens — sempre num canto, em todos os ecrãs.
 *
 * Fica em BAIXO À ESQUERDA de propósito: o botão de adicionar (Fab) vive em
 * baixo à direita e a barra inferior ocupa o fundo no telemóvel. No computador
 * afasta-se o suficiente para não ficar por cima da barra lateral.
 */
export default function FeedbackButton() {
  const { t } = useT()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState(null)

  const podeEnviar = message.trim().length >= MIN_MESSAGE && !sending

  function abrir() {
    setKind('bug'); setMessage(''); setErr(null); setSent(false); setOpen(true)
  }

  async function enviar(e) {
    e.preventDefault()
    if (!podeEnviar) return
    setSending(true); setErr(null)
    try {
      await sendFeedback({ message: message.trim(), kind, page: pathname })
      setSent(true)
      setMessage('')
    } catch (e2) {
      setErr(errorText(e2, t))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={abrir}
        aria-label={t('feedback.open')}
        className="fixed z-30 left-4 bottom-24 md:left-[16rem] md:bottom-6
                   flex items-center gap-2 rounded-full px-3 py-3 sm:py-2.5 sm:pr-4
                   bg-[#0d1626]/90 backdrop-blur-xl border border-white/15
                   text-slate-300 shadow-card hover:text-white hover:border-nova-500/40
                   active:scale-95 transition">
        <Icon name="chat" className="w-5 h-5 text-nova-300" />
        {/* No telemóvel só o ícone: o espaço em baixo é disputado. */}
        <span className="hidden sm:inline text-sm font-semibold">{t('feedback.open')}</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t('feedback.title')}>
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-center mb-3">
              <Icon name="check" className="w-7 h-7" />
            </div>
            <p className="font-semibold text-slate-100">{t('feedback.sentTitle')}</p>
            <p className="text-sm text-slate-400 mt-1.5">{t('feedback.sentHint')}</p>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setSent(false); setMessage('') }} className="btn-ghost flex-1 py-2.5 text-sm">
                {t('feedback.sendAnother')}
              </button>
              <button onClick={() => setOpen(false)} className="btn-ghost flex-1 py-2.5 text-sm">
                {t('common.close')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <p className="text-sm text-slate-400">{t('feedback.hint')}</p>

            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button type="button" key={k} onClick={() => setKind(k)}
                  className={`py-2.5 seg flex flex-col items-center gap-1 ${kind === k ? 'seg-on' : 'seg-off'}`}>
                  <Icon name={KIND_ICON[k]} className="w-5 h-5" />
                  <span className="text-xs">{t(`feedback.kind.${k}`)}</span>
                </button>
              ))}
            </div>

            <div>
              <textarea
                className="input min-h-[140px] resize-y"
                autoFocus
                maxLength={MAX_MESSAGE}
                placeholder={t(`feedback.placeholder.${kind}`)}
                value={message}
                onChange={(e) => setMessage(e.target.value)} />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-slate-500">{t('feedback.context', { page: pathname })}</p>
                <p className="text-[11px] text-slate-600 tabular-nums">{message.length}/{MAX_MESSAGE}</p>
              </div>
            </div>

            {err && (
              <p className="text-sm text-rose-200 bg-rose-500/15 border border-rose-500/20 rounded-xl px-3.5 py-2.5">{err}</p>
            )}

            <div>
              <button type="submit" disabled={!podeEnviar}
                className="btn-primary w-full"
                style={{ backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 100%)' }}>
                <Icon name="send" className="w-4 h-4" />
                {sending ? t('feedback.sending') : t('feedback.send')}
              </button>
              {/* O Cláudio lê a mensagem antes de ela seguir, e isso leva uns
                  15 segundos. Sem dizer nada, um botão parado tanto tempo
                  parece avariado — e o aluno carrega outra vez. */}
              {sending && (
                <p className="text-xs text-slate-400 text-center mt-2.5 flex items-center justify-center gap-1.5">
                  <Icon name="spark" className="w-3.5 h-3.5 text-nova-300" />
                  {t('feedback.sendingHint')}
                </p>
              )}
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
