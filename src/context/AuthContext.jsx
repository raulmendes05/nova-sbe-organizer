import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'
import { termKey } from '../lib/helpers.js'
import { urlRecovery } from '../lib/authUrl.js'

const AuthContext = createContext({ user: null, loading: true })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  // A entrar por um link de recuperacao: ha sessao, mas o aluno ainda nao sabe
  // a palavra-passe. Fica no sessionStorage para uma recarga da pagina nao o
  // despejar dentro da app sem lhe ter pedido uma nova.
  const [recovery, setRecovery] = useState(() => urlRecovery || readRecovery())

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      // Quem entra com a palavra-passe e porque a sabe — mesmo que antes tenha
      // aberto um link de recuperacao gasto, que deixou a marca para tras. O
      // link valido nao passa por aqui: esse da PASSWORD_RECOVERY.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setRecovery(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  // Gravar o sinal da recuperacao e so o lado do armazenamento: o estado acima
  // e que manda no que esta no ecra.
  useEffect(() => { writeRecovery(recovery) }, [recovery])

  const signOut = () => { setRecovery(false); return supabase?.auth.signOut() }

  // Palavra-passe nova no fim de uma recuperacao. Guardar e sair do modo de
  // recuperacao e a mesma acao — senao o ecra ficava preso depois de gravar.
  async function setPassword(password) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setRecovery(false)
  }

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
      recovery, setPassword, endRecovery: () => setRecovery(false),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

const RECOVERY_KEY = 'novasbe.recovery'
function readRecovery() {
  try { return sessionStorage.getItem(RECOVERY_KEY) === '1' } catch { return false }
}
function writeRecovery(on) {
  try {
    if (on) sessionStorage.setItem(RECOVERY_KEY, '1')
    else sessionStorage.removeItem(RECOVERY_KEY)
  } catch { /* modo privado — ignora */ }
}

const LANG_KEY = 'novasbe.lang'
function readStoredLang() {
  try { return localStorage.getItem(LANG_KEY) } catch { return null }
}
function writeStoredLang(v) {
  try { localStorage.setItem(LANG_KEY, v) } catch { /* modo privado — ignora */ }
}
