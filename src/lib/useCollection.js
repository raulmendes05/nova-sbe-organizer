import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Hook generico de CRUD para uma tabela do Supabase, sempre filtrada
 * pelo utilizador autenticado. Devolve { rows, loading, error, add, update, remove, reload }.
 */
export function useCollection(table, { orderBy = 'created_at', ascending = false } = {}) {
  const { user } = useAuth()
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
    if (error) setError(error.message)
    else setRows(data ?? [])
    setLoading(false)
  }, [table, orderBy, ascending, user])

  useEffect(() => {
    reload()
  }, [reload])

  const add = async (values) => {
    const { data, error } = await supabase
      .from(table)
      .insert({ ...values, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    setRows((prev) => [data, ...prev])
    return data
  }

  const update = async (id, values) => {
    const { data, error } = await supabase
      .from(table)
      .update(values)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setRows((prev) => prev.map((r) => (r.id === id ? data : r)))
    return data
  }

  const remove = async (id) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) throw error
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  return { rows, loading, error, add, update, remove, reload }
}
