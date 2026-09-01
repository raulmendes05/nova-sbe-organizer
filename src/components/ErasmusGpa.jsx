import { useState } from 'react'
import { Icon } from './ui.jsx'
import { erasmusGpa, checkNumber, LIMITS } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

/**
 * Calculadora da GPA de Erasmus — a metrica das candidaturas a mobilidade,
 * que nao e a media: 75% de nota e 25% de ritmo de creditos.
 *
 * A media e os ECTS ja feitos vêm das Notas; os semestres tem de ser o aluno a
 * dizer. Os ECTS sao SO os feitos na Nova — creditos vindos de outra faculdade
 * nao contam para o ritmo. Ja incluem os modulos Pass/Fail dados como feitos
 * (Careers with Impact), que valem ECTS sem valer nota; ficam editaveis para o
 * aluno poder acrescentar outros casos que a app nao conheca.
 */
export default function ErasmusGpa({ gpa, ects, ectsDeFora = 0, equivalencias = 0, ectsPassFail = 0 }) {
  const { t } = useT()
  const [aberto, setAberto] = useState(false)
  const [semestres, setSemestres] = useState('')
  const [ectsDraft, setEctsDraft] = useState(null)   // null = usa o das Notas

  const ectsUsados = ectsDraft === null ? ects : ectsDraft
  // Nem 0 semestres nem 500 ECTS dizem alguma coisa — mais vale explicar do
  // que devolver um número que não quer dizer nada.
  const malSemestres = checkNumber(semestres, LIMITS.semesters, t)
  const malEcts = checkNumber(ectsUsados, LIMITS.ectsTotal, t)
  const r = malSemestres || malEcts ? null : erasmusGpa(gpa, ectsUsados, semestres)

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
          <input type="number" min={LIMITS.semesters.min} max={LIMITS.semesters.max} step="1" inputMode="numeric" autoFocus
            className="input mt-1" placeholder="2"
            value={semestres} onChange={(e) => setSemestres(e.target.value)} />
          {malSemestres && <span role="alert" className="block text-xs text-rose-300 mt-1">{malSemestres}</span>}
        </label>
        <label className="block">
          <span className="text-xs text-slate-400">{t('erasmus.ects')}</span>
          <input type="number" min="0" max={LIMITS.ectsTotal.max} step="0.5" inputMode="decimal"
            className="input mt-1"
            value={ectsUsados ?? ''} onChange={(e) => setEctsDraft(e.target.value)} />
          {malEcts && <span role="alert" className="block text-xs text-rose-300 mt-1">{malEcts}</span>}
        </label>
      </div>

      {ectsDeFora > 0 && ectsDraft === null && (
        <p className="text-xs text-slate-500 mt-2">
          {t('erasmus.excluded', { ects: ectsDeFora, n: equivalencias })}
        </p>
      )}

      {ectsPassFail > 0 && ectsDraft === null && (
        <p className="text-xs text-slate-500 mt-2">
          {t('erasmus.passFail', { ects: ectsPassFail })}
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
