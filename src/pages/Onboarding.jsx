import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { firstYearCourses } from '../data/curriculum.js'
import { COURSE_COLORS } from '../lib/helpers.js'

const YEARS = [
  { v: '1', label: '1º ano' },
  { v: '2', label: '2º ano' },
  { v: '3', label: '3º ano' },
]
const SEMESTERS = [
  { v: '1', label: '1º semestre' },
  { v: '2', label: '2º semestre' },
]

/**
 * Ecra de boas-vindas — primeiro login. Recolhe nome, ano e semestre.
 * Se o aluno ja concluiu o 1o ano, oferece preencher as cadeiras nucleares
 * do 1o ano para poder lancar as notas.
 */
export default function Onboarding() {
  const { user, displayName, program } = useAuth()
  const [name, setName] = useState(displayName || '')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [addFirstYear, setAddFirstYear] = useState(true)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)

  const finishedFirstYear = year === '2' || year === '3'

  async function save(e) {
    e.preventDefault()
    if (!name.trim() || !year || !semester) {
      setErr('Preenche o nome, o ano e o semestre.')
      return
    }
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
      const { error } = await supabase.auth.updateUser({
        data: { display_name: name.trim(), year, semester, program },
      })
      if (error) throw error
    } catch (e2) {
      setErr('Algo correu mal. Tenta outra vez.')
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
          <h1 className="text-2xl font-bold">Bem-vindo(a)!</h1>
          <p className="text-nova-200 text-sm mt-1">Vamos configurar a tua conta.</p>
        </div>

        <form onSubmit={save} className="space-y-5">
          <div>
            <label className="text-sm text-nova-100">Como te queres chamar?</label>
            <input autoFocus type="text" required maxLength={40} value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-1 rounded-xl bg-white/10 border border-white/20 px-3.5 py-3 outline-none focus:border-white/60 placeholder-nova-200"
              placeholder="O teu nome" />
          </div>

          <div>
            <label className="text-sm text-nova-100">Em que ano estás?</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {YEARS.map((y) => (
                <button type="button" key={y.v} onClick={() => setYear(y.v)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    year === y.v ? 'bg-white text-nova-800 border-transparent' : 'bg-white/10 border-white/20 text-white'
                  }`}>{y.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-nova-100">Que semestre?</label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {SEMESTERS.map((s) => (
                <button type="button" key={s.v} onClick={() => setSemester(s.v)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    semester === s.v ? 'bg-white text-nova-800 border-transparent' : 'bg-white/10 border-white/20 text-white'
                  }`}>{s.label}</button>
              ))}
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
                <span className="block text-sm font-semibold">Já concluí o 1º ano</span>
                <span className="block text-xs text-nova-200 mt-0.5">Adicionar as 9 cadeiras do 1º ano para lançares as notas.</span>
              </span>
            </button>
          )}

          {err && <p className="text-sm text-rose-100 bg-rose-500/20 rounded-lg px-3 py-2">{err}</p>}

          <button disabled={loading}
            className="w-full rounded-xl bg-white text-nova-800 font-bold py-3 active:scale-[0.98] transition disabled:opacity-60">
            {loading ? 'A guardar...' : 'Continuar'}
          </button>
        </form>
        <p className="text-center text-nova-300 text-xs mt-4">Podes mudar tudo isto mais tarde.</p>
      </div>
    </div>
  )
}
