import { Icon } from './ui.jsx'
import { useT } from '../i18n/index.jsx'

/**
 * Cadeira sem nota (os dois Data Handling): só feita ou por fazer.
 *
 * O Careers with Impact tem ecrã próprio por ser dividido em módulos; aqui é
 * um interruptor só. Os ECTS contam assim que está feita, a nota nunca — que é
 * o que a folha oficial da escola faz com estas linhas.
 */
export default function PassFailCourse({ course, feita, onToggle, busy, notaAntiga = null, restos = 0, onLimpar }) {
  const { t } = useT()
  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{t('passfail.hint')}</p>

      <button type="button" disabled={busy} onClick={() => onToggle(!feita)} aria-pressed={feita}
        className={`w-full flex items-center gap-3 text-left rounded-xl p-3 border transition disabled:opacity-60 ${
          feita ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.04] border-white/10'}`}>
        <span className={`w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 transition ${
          feita ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'}`}>
          {feita && <Icon name="check" className="w-4 h-4 text-white" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-100">
            {feita ? t('passfail.done') : t('passfail.todo')}
          </span>
          <span className="block text-[11px] text-slate-500">
            {t('passfail.ects', { n: course.ects, feitos: feita ? course.ects : 0 })}
          </span>
        </span>
      </button>

      {(restos > 0 || notaAntiga !== null) && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
          <p className="text-xs text-amber-100/90 leading-relaxed">
            {t('cwi.leftovers', { n: restos, grade: notaAntiga === null ? '—' : Number(notaAntiga).toFixed(1) })}
          </p>
          {onLimpar && (
            <button type="button" onClick={onLimpar} disabled={busy}
              className="btn-ghost w-full py-2 text-sm mt-2">{t('cwi.clean')}</button>
          )}
        </div>
      )}
    </div>
  )
}
