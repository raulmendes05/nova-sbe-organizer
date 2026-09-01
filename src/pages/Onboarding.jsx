import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { firstYearCourses } from '../data/curriculum.js'
import { COURSE_COLORS, termKey, checkNumber, LIMITS } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'
import { errorText } from '../lib/errors.js'

const YEARS = ['1', '2', '3']
const SEMESTERS = ['1', '2']

/**
 * Ecra de boas-vindas — primeiro login. Recolhe nome, ano e semestre.
 * Se o aluno ja concluiu o 1o ano, oferece preencher as cadeiras nucleares
 * do 1o ano para poder lancar as notas.
 */
export default function Onboarding() {
  const { user, displayName, program } = useAuth()
  const { t } = useT()
  const [name, setName] = useState(displayName || '')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [goal, setGoal] = useState('')
  const [addFirstYear, setAddFirstYear] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const finishedFirstYear = year === '2' || year === '3'

  async function save(e) {
    e.preventDefault()
    if (!name.trim() || !year || !semester) {
      setErr(t('onboarding.errRequired'))
      return
    }
    const malGoal = checkNumber(goal, LIMITS.grade, t)
    if (malGoal) { setErr(malGoal); return }
    setLoading(true)
    setErr(null)
    try {
      // Inserir cadeiras do 1o ano (sem duplicar as ja existentes)
      if (finishedFirstYear && addFirstYear) {
        const { data: existing } = await supabase
          .from('courses').select('code').eq('user_id', user.id)
        const have = new Set((existing || []).map((c) => c.code))
        const toInsert = firstYearCourses(program)
          .filter((c) => !have.has(c.code))
          .map((c, i) => ({
            user_id: user.id,
            name: c.name,
            code: c.code,
            ects: c.ects,
            color: COURSE_COLORS[i % COURSE_COLORS.length],
            year: 1,
          }))
        if (toInsert.length) {
          const { error } = await supabase.from('courses').insert(toInsert)
          if (error) throw error
        }
      }

      // Guardar preferencias (dispara USER_UPDATED -> app abre)
      const data = { display_name: name.trim(), year, semester, program }
      if (goal.trim() !== '') {
        data.goals = { [termKey(Number(year), Number(semester))]: Number(goal) }
      }
      const { error } = await supabase.auth.updateUser({ data })
      if (error) throw error
    } catch (e2) {
      setErr(errorText(e2, t))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10 bg-gradient-to-b from-nova-800 to-nova-900 text-white">
      <div className="max-w-sm w-full mx-auto">
        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h1 className="text-2xl font-bold">{t('onboarding.welcome')}</h1>
          <p className="text-nova-200 text-sm mt-1">{t('onboarding.sub')}</p>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="text-sm text-nova-100">{t('onboarding.name')}</label>
            <input autoFocus type="text" required maxLength={40} value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 rounded-xl bg-white/10 border border-white/20 px-3.5 py-3 outline-none focus:border-white/60 placeholder-nova-200"
              placeholder={t('profile.namePlaceholder')} />
          </div>

          <div>
            <label className="text-sm text-nova-100">{t('onboarding.year')}</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {YEARS.map((v) => (
                <button type="button" key={v} onClick={() => setYear(v)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    year === v ? 'bg-white text-nova-800 border-transparent' : 'bg-white/10 border-white/20 text-white'
                  }`}>{t(`profile.year${v}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-nova-100">{t('onboarding.semester')}</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {SEMESTERS.map((v) => (
                <button type="button" key={v} onClick={() => setSemester(v)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    semester === v ? 'bg-white text-nova-800 border-transparent' : 'bg-white/10 border-white/20 text-white'
                  }`}>{t(`profile.sem${v}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-nova-100">{t('onboarding.goal')}</label>
            <div className="flex items-center gap-2 mt-1.5">
              <input type="number" step="0.5" min="0" max="20" inputMode="decimal" value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-24 rounded-xl bg-white/10 border border-white/20 px-3.5 py-3 text-lg font-semibold outline-none focus:border-white/60 placeholder-nova-200"
                placeholder={t('profile.goalPlaceholder')} />
              <span className="text-nova-200">/ 20</span>
              <span className="text-xs text-nova-300 ml-1">{t('common.optional')}</span>
            </div>
          </div>

          {finishedFirstYear && (
            <button type="button" onClick={() => setAddFirstYear(!addFirstYear)}
              className="w-full flex items-start gap-3 text-left rounded-2xl bg-white/10 border border-white/20 p-3.5">
              <span className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition ${
                addFirstYear ? 'bg-accent-500 border-accent-500' : 'border-white/40'
              }`}>
                {addFirstYear && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </span>
              <span>
                <span className="block text-sm font-semibold">{t('onboarding.firstYearDone')}</span>
                <span className="block text-xs text-nova-200 mt-0.5">{t('onboarding.firstYearHint')}</span>
              </span>
            </button>
          )}

          {err && <p className="text-sm text-rose-100 bg-rose-500/20 rounded-lg px-3 py-2">{err}</p>}

          <button disabled={loading}
            className="w-full rounded-xl bg-white text-nova-800 font-bold py-3 active:scale-[0.98] transition disabled:opacity-60">
            {loading ? t('common.saving') : t('onboarding.continue')}
          </button>
        </form>
        <p className="text-center text-nova-300 text-xs mt-4">{t('onboarding.later')}</p>
      </div>
    </div>
  )
}
