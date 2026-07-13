import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isConfigured } from '../lib/supabase.js'

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

  return (
    <AuthContext.Provider value={{ user, loading, signOut, displayName, academicYear, semester, program }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
