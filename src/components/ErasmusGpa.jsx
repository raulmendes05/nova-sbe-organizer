import { useState } from 'react'
import { Icon } from './ui.jsx'
import { erasmusGpa } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

/**
 * Calculadora da GPA de Erasmus — a metrica das candidaturas a mobilidade,
 * que nao e a media: 75% de nota e 25% de ritmo de creditos.
 *
 * A media e os ECTS ja feitos vêm das Notas; os semestres tem de ser o aluno a
 * dizer. Os ECTS sao SO os feitos na Nova — creditos vindos de outra faculdade
 * nao contam para o ritmo. Ficam editaveis de proposito: a folha da escola
 * conta ai as cadeiras Pass/Fail (Data Handling, Careers with Impact), que a
 * app nao distingue das outras.
 */
export default function ErasmusGpa({ gpa, ects, ectsDeFora = 0, equivalencias = 0 }) {
  const { t } = useT()
  const [aberto, setAberto] = useState(false)
  const [semestres, setSemestres] = useState('')
  const [ectsDraft, setEctsDraft] = useState(null)   // null = usa o das Notas

  const ectsUsados = ectsDraft === null ? ects : ectsDraft
  const r = erasmusGpa(gpa, ectsUsados, semestres)

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)}
        className="card w-full p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition">
        <span className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-300 flex items-center justify-center shrink-0">
          <Icon name="cap" className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-200">{t('erasmus.title')}</span>
          <span className="block text-xs text-slate-500">{t('erasmus.teaser')}</span>
        </span>
        <Icon name="chevron" className="w-4 h-4 text-slate-500 shrink-0" />
      </button>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-semibold text-slate-200">{t('erasmus.title')}</p>
        <button onClick={() => setAberto(false)} className="p-1 -m-1 text-slate-500 shrink-0">
          <Icon name="close" className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed mb-4">{t('erasmus.body')}</p>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-slate-400">{t('erasmus.semesters')}</span>
          <input type="number" min="1" max="6" step="1" inputMode="numeric" autoFocus
            className="input mt-1" placeholder="2"
            value={semestres} onChange={(e) => setSemestres(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">{t('erasmus.ects')}</span>
          <input type="number" min="0" step="0.5" inputMode="decimal"
            className="input mt-1"
            value={ectsUsados ?? ''} onChange={(e) => setEctsDraft(e.target.value)} />
        </label>
      </div>

      {ectsDeFora > 0 && ectsDraft === null && (
        <p className="text-xs text-slate-500 mt-2">
          {t('erasmus.excluded', { ects: ectsDeFora, n: equivalencias })}
        </p>
      )}

      {gpa === null || gpa === undefined ? (
        <p className="text-sm text-slate-400 mt-4">{t('erasmus.noGrades')}</p>
      ) : !r ? (
        <p className="text-sm text-slate-400 mt-4">{t('erasmus.needSemesters')}</p>
      ) : (
        <>
          <div className="flex items-end gap-2 mt-4">
            <span className="text-4xl font-bold text-white tracking-tight">{r.valor.toFixed(2)}</span>
            <span className="text-slate-500 mb-1 text-sm">/ 20</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {t('erasmus.breakdown', {
              gpa: r.gpa.toFixed(2),
              pace: Math.round(r.ritmo * 100),
              ects: ectsUsados,
              full: 30 * Number(semestres),
            })}
          </p>
          {r.ritmo > 1 && <p className="text-xs text-amber-300/90 mt-2">{t('erasmus.overPace')}</p>}
        </>
      )}

      <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">{t('erasmus.source')}</p>
    </div>
  )
}
