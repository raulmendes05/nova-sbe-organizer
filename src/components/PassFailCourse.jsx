import { Icon } from './ui.jsx'
import { termLabel, termKey, DEGREE_TERMS } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

/**
 * Cadeira sem nota (os dois Data Handling): só feita ou por fazer.
 *
 * O Careers with Impact tem ecrã próprio por ser dividido em módulos; aqui é
 * um interruptor só. Os ECTS contam assim que está feita, a nota nunca — que é
 * o que a folha oficial da escola faz com estas linhas.
 *
 * Depois de marcada aparece o semestre em que foi feita. Estas cadeiras não
 * vivem num semestre (fazem-se ao longo do curso), mas a GPA de Erasmus só
 * conta o que já estava fechado antes da candidatura — por isso a escolha tem
 * de estar aqui, à vista, e não escondida no "Editar cadeira".
 */
export default function PassFailCourse({ course, feita, onToggle, quando = null, onPeriodo, busy, notaAntiga = null, restos = 0, onLimpar }) {
  const { t } = useT()
  const temPeriodo = Boolean(quando?.year && quando?.term)

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

      {/* Em que semestre a fez. Só depois de marcada — antes disso não há data
          nenhuma para guardar. */}
      {feita && onPeriodo && (
        <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 space-y-2">
          <label className="flex items-center gap-2">
            <span className="text-xs text-slate-300 shrink-0">{t('passfail.doneIn')}</span>
            <select
              className="input py-1.5 text-xs flex-1"
              disabled={busy}
              value={temPeriodo ? termKey(quando.year, quando.term) : ''}
              onChange={(e) => {
                const [a, sm] = DEGREE_TERMS.find(([y, tt]) => termKey(y, tt) === Number(e.target.value)) || []
                if (a) onPeriodo(a, sm)
              }}>
              <option value="" disabled>{t('passfail.doneInPick')}</option>
              {DEGREE_TERMS.map(([a, sm]) => (
                <option key={`${a}-${sm}`} value={termKey(a, sm)}>{termLabel(a, sm, t)}</option>
              ))}
            </select>
          </label>
          {temPeriodo ? (
            <p className="text-[11px] text-slate-500 leading-relaxed">{t('passfail.doneInHint')}</p>
          ) : (
            <p className="text-[11px] text-amber-200/90 leading-relaxed">{t('passfail.doneInMissing')}</p>
          )}
        </div>
      )}

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
