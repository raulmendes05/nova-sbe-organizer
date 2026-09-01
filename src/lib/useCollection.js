import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useT } from '../i18n/index.jsx'
import { errorText } from './errors.js'

/**
 * Hook generico de CRUD para uma tabela do Supabase, sempre filtrada
 * pelo utilizador autenticado. Devolve { rows, loading, error, add, update, remove, reload }.
 */
export function useCollection(table, { orderBy = 'created_at', ascending = false } = {}) {
  const { user } = useAuth()
  const { t } = useT()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', user.id)
      .order(orderBy, { ascending })
    if (error) setError(errorText(error, t))
    else setRows(data ?? [])
    setLoading(false)
  }, [table, orderBy, ascending, user, t])

  useEffect(() => {
    reload()
  }, [reload])

  // As escritas continuam a rebentar (quem chama precisa de saber que falhou),
  // mas passam sempre pelo `error` primeiro — assim a pagina tem o que mostrar
  // mesmo que se esqueca do try/catch.
  const fail = (error) => { setError(errorText(error, t)); throw error }

  const add = async (values) => {
    const { data, error } = await supabase
      .from(table)
      .insert({ ...values, user_id: user.id })
      .select()
      .single()
    if (error) fail(error)
    setRows((prev) => [data, ...prev])
    setError(null)
    return data
  }

  const update = async (id, values) => {
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (error) fail(error)
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)))
    setError(null)
    return data
  }

  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) fail(error)
    setRows((prev) => prev.filter((r) => r.id !== id))
    setError(null)
  }

  return { rows, loading, error, clearError: () => setError(null), add, update, remove, reload }
}
