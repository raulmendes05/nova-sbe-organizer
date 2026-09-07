import { useState } from 'react'
import { Icon } from './ui.jsx'
import { useT } from '../i18n/index.jsx'

/**
 * Uma carta de cada vez: a pergunta (ou o termo), o aluno pensa, revela, e diz
 * se acertou. Quem corrige é ele — é o que obriga a formular a resposta de
 * cabeça antes de a ver, que é onde está o valor disto.
 *
 * As respostas ficam em memória e só vão à base de dados no fim (ou quando ele
 * sai): quinze cartas não são quinze escritas.
 */
export default function Quiz({ cartas, onTerminar, onSair }) {
  const { t } = useT()
  const [i, setI] = useState(0)
  const [virada, setVirada] = useState(false)
  const [respostas, setRespostas] = useState([])   // [{ carta, acertou }]

  const carta = cartas[i]
  const acertos = respostas.filter((r) => r.acertou).length

  function responder(acertou) {
    const novas = [...respostas, { carta, acertou }]
    setRespostas(novas)
    setVirada(false)
    if (i + 1 < cartas.length) setI(i + 1)
    else onTerminar(novas)
  }

  if (!carta) return null

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 tabular-nums">
          {t('quiz.progress', { n: i + 1, total: cartas.length })}
        </p>
        <button onClick={() => onSair(respostas)} className="text-xs text-slate-400 hover:text-white">
          {t('quiz.leave')}
        </button>
      </div>

      <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-4">
        <div className="h-full rounded-full bg-nova-400 transition-all"
          style={{ width: `${(i / cartas.length) * 100}%` }} />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-nova-300 mb-1.5">
        {t(carta.tipo === 'termo' ? 'quiz.term' : 'quiz.question')}
      </p>
      <p className="text-lg font-semibold text-white leading-snug">{carta.frente}</p>

      {!virada ? (
        <>
          <p className="text-xs text-slate-500 mt-3">{t('quiz.thinkFirst')}</p>
          <button onClick={() => setVirada(true)} className="btn-primary w-full py-2.5 mt-3">
            {t('quiz.reveal')}
          </button>
        </>
      ) : (
        <>
          <div className="mt-3 rounded-xl bg-white/[0.05] border border-white/10 p-3">
            <p className="text-sm text-slate-200 leading-relaxed">{carta.verso}</p>
            {carta.fonte && <p className="text-[11px] text-slate-500 mt-2">{t('quiz.from', { o: carta.fonte })}</p>}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => responder(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-rose-200 bg-rose-500/10 border border-rose-500/25 active:scale-[0.98] transition">
              {t('quiz.wrong')}
            </button>
            <button onClick={() => responder(true)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-emerald-200 bg-emerald-500/10 border border-emerald-500/25 active:scale-[0.98] transition">
              {t('quiz.right')}
            </button>
          </div>
        </>
      )}

      {respostas.length > 0 && (
        <p className="text-[11px] text-slate-500 mt-3 text-center tabular-nums">
          {t('quiz.sofar', { n: acertos, total: respostas.length })}
        </p>
      )}
    </div>
  )
}

/** O que aparece quando a sessão acaba. */
export function QuizFim({ acertos, total, proxima, onFechar, lang }) {
  const { t } = useT()
  const bom = total > 0 && acertos / total >= 0.7
  return (
    <div className="card p-4 text-center">
      <span className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center ${
        bom ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'
      }`}>
        <Icon name={bom ? 'check' : 'clock'} className="w-6 h-6" />
      </span>
      <p className="text-lg font-bold text-white mt-3">{t('quiz.doneTitle', { n: acertos, total })}</p>
      <p className="text-sm text-slate-400 mt-1">
        {bom ? t('quiz.doneGood') : t('quiz.doneAgain')}
      </p>
      {proxima && (
        <p className="text-xs text-slate-500 mt-2">
          {t('quiz.next', { data: new Date(`${proxima}T12:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT', { day: 'numeric', month: 'long' }) })}
        </p>
      )}
      <button onClick={onFechar} className="btn-ghost w-full py-2.5 mt-4 text-sm">{t('common.close')}</button>
    </div>
  )
}
