import { useEffect } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { roomFor } from './enroll.js'
import { errorText } from './errors.js'

const FEITO = 'roomBackfill'

/**
 * A escola so publicou as salas depois de o semestre comecar, por isso os
 * horarios que os alunos ja tinham criado ficaram sem sala. Isto preenche-as
 * na primeira vez que cada um abre a app.
 *
 * Duas regras: nunca escreve por cima de uma sala que ja la esteja (pode ter
 * sido o aluno a escreve-la) e, se o bloco nao corresponder com certeza a uma
 * aula do horario oficial, deixa-o em paz.
 */
export function useRoomBackfill() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    // Uma vez por sessao chega: depois de preenchidas, nao ha o que fazer.
    try {
      if (sessionStorage.getItem(FEITO) === user.id) return
      sessionStorage.setItem(FEITO, user.id)
    } catch { /* sem sessionStorage — corre na mesma */ }

    let cancelado = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('schedule_blocks')
          .select('id, title, day_of_week, start_time, location')
          .eq('user_id', user.id)
        if (error) throw error
        if (cancelado || !data?.length) return

        const porPreencher = data
          .filter((b) => !String(b.location || '').trim())
          .map((b) => ({ id: b.id, sala: roomFor(b.title, b.day_of_week, b.start_time) }))
          .filter((b) => b.sala)
        if (!porPreencher.length || cancelado) return

        for (const b of porPreencher) {
          if (cancelado) return
          const { error: e } = await supabase
            .from('schedule_blocks').update({ location: b.sala }).eq('id', b.id)
          if (e) throw e
        }
      } catch (e) {
        // Reparacao em segundo plano: nao vale a pena interromper o aluno com
        // isto, mas tambem nao se engole calado — fica na consola e volta a
        // tentar na proxima sessao.
        try { sessionStorage.removeItem(FEITO) } catch { /* ignore */ }
        console.error('Não consegui preencher as salas do horário:', errorText(e))
      }
    })()
    return () => { cancelado = true }
  }, [user])
}
