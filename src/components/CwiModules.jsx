import { Icon } from './ui.jsx'
import { CWI_MODULES, CWI_ECTS, CWI_ROLE_TO_PLAY_POINTS, cwiDone, cwiTitle } from '../data/cwi.js'
import { useT } from '../i18n/index.jsx'

/**
 * Careers with Impact: 4 modulos independentes, cada um feito / nao feito.
 *
 * Substitui a caixa da nota final e as componentes de avaliacao — esta cadeira
 * nao tem nota nenhuma. Cada modulo concluido vale 1 ECTS, e da para ter o I
 * feito e os outros por fazer.
 */
export default function CwiModules({ rows, onToggle, busy, notaAntiga = null, onLimpar }) {
  const { t } = useT()
  const feitos = cwiDone(rows)
  const done = new Set(feitos.map((m) => m.id))
  const ects = feitos.reduce((s, m) => s + m.ects, 0)
  // Quem usou a app antes disto pode ter aqui uma nota ou componentes de
  // avaliacao. Deixaram de contar para alguma coisa — mais vale dizer-lho do
  // que fazer desaparecer o que ele escreveu.
  const restos = (rows || []).filter((r) => !feitos.some((m) => r.title === cwiTitle(m.id))
    && !CWI_MODULES.some((m) => r.title === cwiTitle(m.id)))
  const temRestos = restos.length > 0 || notaAntiga !== null

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-slate-200">
            {t('cwi.progress', { n: done.size, total: CWI_MODULES.length, ects, totalEcts: CWI_ECTS })}
          </p>
          <span className="text-xs text-slate-500">{t('grades.passFail')}</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400/80 transition-all"
            style={{ width: `${(done.size / CWI_MODULES.length) * 100}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">{t('cwi.noGrade')}</p>
      </div>

      <div className="space-y-2">
        {CWI_MODULES.map((m) => {
          const feito = done.has(m.id)
          return (
            <button key={m.id} type="button" disabled={busy}
              onClick={() => onToggle(m.id, !feito)}
              aria-pressed={feito}
              className={`w-full flex items-start gap-3 text-left rounded-xl p-3 border transition disabled:opacity-60 ${
                feito ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.04] border-white/10'}`}>
              <span className={`w-6 h-6 rounded-md flex items-center justify-center border-2 shrink-0 mt-0.5 transition ${
                feito ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'}`}>
                {feito && <Icon name="check" className="w-4 h-4 text-white" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-100">
                    {t('cwi.module', { id: m.id })} — {t(`cwi.${m.id}.name`)}
                  </span>
                  <span className="chip bg-white/10 text-slate-300">{t('cwi.ects', { n: m.ects })}</span>
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  {t(m.auto ? 'cwi.auto' : 'cwi.self')}
                </span>
                <ul className="mt-1.5 space-y-0.5">
                  {m.reqs.map((k) => (
                    <li key={k} className="text-xs text-slate-400 leading-snug flex gap-1.5">
                      <span className="text-slate-600">•</span>{t(k)}
                    </li>
                  ))}
                </ul>
              </span>
            </button>
          )
        })}
      </div>

      {temRestos && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
          <p className="text-xs text-amber-100/90 leading-relaxed">
            {t('cwi.leftovers', { n: restos.length, grade: notaAntiga === null ? '—' : Number(notaAntiga).toFixed(1) })}
          </p>
          {onLimpar && (
            <button type="button" onClick={onLimpar} disabled={busy}
              className="btn-ghost w-full py-2 text-sm mt-2">{t('cwi.clean')}</button>
          )}
        </div>
      )}

      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 space-y-2">
        <p className="text-xs text-slate-400 leading-relaxed">{t('cwi.enrolNote')}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{t('cwi.qrNote')}</p>
        <p className="text-xs text-slate-400 leading-relaxed">{t('cwi.pointsNote', { points: CWI_ROLE_TO_PLAY_POINTS })}</p>
      </div>
    </div>
  )
}
