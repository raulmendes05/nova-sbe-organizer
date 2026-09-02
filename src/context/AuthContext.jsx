import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'
import { termKey } from '../lib/helpers.js'

const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const signOut = () => supabase?.auth.signOut()

  // Preferencias do utilizador (metadados da conta)
  const meta = user?.user_metadata || {}
  const displayName = meta.display_name || ''
  const academicYear = meta.year || ''      // '1' | '2' | '3'
  const semester = meta.semester || ''      // '1' | '2'
  const program = meta.program || 'management'
  // Antes do login nao ha metadados, por isso o ultimo idioma escolhido fica
  // tambem no localStorage — senao o ecra de entrada estaria sempre em pt.
  const lang = meta.lang || readStoredLang() || 'pt'   // 'pt' | 'en'
  // Visita guiada dos primeiros passos: uma vez por conta (e nao por
  // dispositivo, dai ficar nos metadados e nao no localStorage).
  const tourDone = Boolean(meta.tour_done)

  // Objetivo de média — guardado POR semestre (chave ano+termo), para que ao
  // avançar de semestre o objetivo antigo não se aplique ao novo.
  const currentTermKey = termKey(Number(academicYear) || null, Number(semester) || null)
  const goals = meta.goals || {}
  const goalAvg = goals[currentTermKey] != null ? Number(goals[currentTermKey]) : null

  /**
   * Grava preferencias da conta. Uma so chamada ao Supabase para tudo o que o
   * Perfil altera — nome, ano, semestre, curso, idioma e objetivo — para nao
   * deixar o perfil meio guardado se uma das escritas falhar.
   */
    async function updateProfile(patch) {
    const { error } = await supabase.auth.updateUser({ data: patch })
    if (error) throw error
    if (patch.lang) writeStoredLang(patch.lang)
  }

  async function updateGoal(value) {
    const v = value === '' || value == null ? null : Number(value)
    const next = { ...(meta.goals || {}) }
    if (v == null || isNaN(v)) delete next[currentTermKey]
    else next[currentTermKey] = v
    const { error } = await supabase.auth.updateUser({ data: { goals: next } })
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user, loading, signOut, displayName, academicYear, semester, program, lang,
      goalAvg, goals, currentTermKey, updateGoal, updateProfile, tourDone,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

const LANG_KEY = 'novasbe.lang'
function readStoredLang() {
  try { return localStorage.getItem(LANG_KEY) } catch { return null }
}
function writeStoredLang(v) {
  try { localStorage.setItem(LANG_KEY, v) } catch { /* modo privado — ignora */ }
}
