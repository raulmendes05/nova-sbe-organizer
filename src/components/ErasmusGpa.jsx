import { useState } from 'react'
import { Icon } from './ui.jsx'
import { erasmusGpa, erasmusScope, termLabel, checkNumber, LIMITS } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

// Quando se pode concorrer. O 1.o ano 1.o semestre fica de fora de proposito:
// nessa altura ainda nao ha semestre nenhum concluido, logo nao ha GPA.
const ALTURAS = [[1, 2], [2, 1], [2, 2], [3, 1], [3, 2]]

/**
 * Calculadora da GPA de Erasmus — a metrica das candidaturas a mobilidade,
 * que nao e a media: 75% de nota e 25% de ritmo de creditos.
 *
 * O que conta e o percurso ATE ao semestre anterior a candidatura. O semestre
 * em que se concorre ainda esta a decorrer, e as suas notas ainda nao existem
 * quando a escola avalia o processo — por isso o aluno escolhe aqui quando se
 * candidata e a conta faz-se so com o que ja estava fechado.
 *
 * Os numeros derivados ficam editaveis: a app so conhece o que o aluno la pos,
 * e ha sempre um caso que lhe escapa.
 */
export default function ErasmusGpa({ items = [], defaultYear, defaultTerm }) {
  const { t } = useT()
  const [aberto, setAberto] = useState(false)

  // Por omissao, a altura em que o aluno esta — e quando se concorre.
  const inicial = ALTURAS.find(([a, s]) => a === Number(defaultYear) && s === Number(defaultTerm))
    || ALTURAS.find(([a]) => a === Number(defaultYear))
    || [2, 1]
  const [alturaIdx, setAlturaIdx] = useState(ALTURAS.findIndex(
    ([a, s]) => a === inicial[0] && s === inicial[1]))

  const [ano, sem] = ALTURAS[alturaIdx] || ALTURAS[1]
  const r = erasmusScope(items, ano, sem)

  // null = usa o que foi calculado; um numero = o aluno corrigiu a mao.
  const [semestresDraft, setSemestresDraft] = useState(null)
  const [ectsDraft, setEctsDraft] = useState(null)

  const semestres = semestresDraft === null ? String(r.semestres) : semestresDraft
  const ectsUsados = ectsDraft === null ? r.ects : ectsDraft

  const malSemestres = checkNumber(semestres, LIMITS.semesters, t)
  const malEcts = checkNumber(ectsUsados, LIMITS.ectsTotal, t)
  const conta = malSemestres || malEcts ? null : erasmusGpa(r.gpa, ectsUsados, semestres)

  // Mudar de altura recalcula tudo: as correcoes a mao eram para a anterior.
  function mudarAltura(i) {
    setAlturaIdx(i)
    setSemestresDraft(null)
    setEctsDraft(null)
  }

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

      {/* Quando se candidata — e o que decide o que entra na conta */}
      <label className="block mb-3">
        <span className="text-xs text-slate-400">{t('erasmus.when')}</span>
        <select className="input mt-1" value={alturaIdx}
          onChange={(e) => mudarAltura(Number(e.target.value))}>
          {ALTURAS.map(([a, s], i) => (
            <option key={`${a}-${s}`} value={i}>{termLabel(a, s, t)}</option>
          ))}
        </select>
        <span className="block text-xs text-slate-500 mt-1.5">{t('erasmus.whenHint')}</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-slate-400">{t('erasmus.semesters')}</span>
          <input type="number" min={LIMITS.semesters.min} max={LIMITS.semesters.max} step="1" inputMode="numeric"
            className="input mt-1" placeholder="2"
            value={semestres} onChange={(e) => setSemestresDraft(e.target.value)} />
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

      {/* O que ficou de fora. E a parte que o aluno precisa de ver para
          confiar no numero — senao parece que a app lhe comeu notas. */}
      {r.excluidas > 0 && (
        <p className="text-xs text-violet-200/80 bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2 mt-3 leading-relaxed">
          {t('erasmus.excluded', { n: r.excluidas })}
        </p>
      )}
      {r.semPeriodo > 0 && (
        <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2 mt-2 leading-relaxed">
          {t('erasmus.noTerm', { n: r.semPeriodo })}
        </p>
      )}

      {r.ectsEquivalencias > 0 && ectsDraft === null && (
        <p className="text-xs text-slate-500 mt-2">
          {t('erasmus.equivalences', { ects: r.ectsEquivalencias, n: r.equivalencias })}
        </p>
      )}
      {r.ectsPassFail > 0 && ectsDraft === null && (
        <p className="text-xs text-slate-500 mt-2">
          {t('erasmus.passFail', { ects: r.ectsPassFail })}
        </p>
      )}

      {r.gpa === null || r.gpa === undefined ? (
        <p className="text-sm text-slate-400 mt-4">{t('erasmus.noGradesInScope')}</p>
      ) : !conta ? (
        <p className="text-sm text-slate-400 mt-4">{t('erasmus.needSemesters')}</p>
      ) : (
        <>
          <div className="flex items-end gap-2 mt-4">
            <span className="text-4xl font-bold text-white tracking-tight">{conta.valor.toFixed(2)}</span>
            <span className="text-slate-500 mb-1 text-sm">/ 20</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {t('erasmus.breakdown', {
              gpa: conta.gpa.toFixed(2),
              pace: Math.round(conta.ritmo * 100),
              ects: ectsUsados,
              full: 30 * Number(semestres),
            })}
          </p>
          {conta.ritmo > 1 && <p className="text-xs text-amber-300/90 mt-2">{t('erasmus.overPace')}</p>}
        </>
      )}

      <p className="text-[11px] text-slate-600 mt-4 leading-relaxed">{t('erasmus.source')}</p>
    </div>
  )
}
