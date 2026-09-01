import { useEffect } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { roomFor } from './enroll.js'
import { errorText } from './errors.js'

// A chave leva versao: a primeira versao disto marcava 'feito' antes de
// gravar, e quem ja a apanhou ficaria com a sessao a saltar a reparacao.
const FEITO = 'roomBackfill.v2'
// Evita duas passagens ao mesmo tempo se o efeito voltar a correr a meio.
const aDecorrer = new Set()

/**
 * A escola so publicou as salas depois de o semestre comecar, por isso os
 * horarios que os alunos ja tinham criado ficaram sem sala. Isto preenche-as
 * na primeira vez que cada um abre a app.
 *
 * Duas regras: nunca escreve por cima de uma sala que ja la esteja (pode ter
 * sido o aluno a escreve-la) e, se o bloco nao corresponder com certeza a uma
 * aula do horario oficial, deixa-o em paz.
 *
 * Depende do `user.id` e nao do objeto `user`: o onAuthStateChange do Supabase
 * chama setUser com um objeto NOVO a cada evento (INITIAL_SESSION, SIGNED_IN,
 * USER_UPDATED...), e com o objeto nas dependencias o efeito reiniciava a meio
 * da gravacao. Pela mesma razao isto nao se cancela ao desmontar: nao guarda
 * estado nenhum, so escreve — interromper a meio so faz perder salas.
 */
export function useRoomBackfill() {
  const { user } = useAuth()
  const uid = user?.id

  useEffect(() => {
    if (!uid || aDecorrer.has(uid)) return
    try {
      if (sessionStorage.getItem(FEITO) === uid) return
    } catch { /* sem sessionStorage — corre na mesma */ }
    aDecorrer.add(uid)

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('schedule_blocks')
          .select('id, title, day_of_week, start_time, location')
          .eq('user_id', uid)
        if (error) throw error

        const porPreencher = (data || [])
          .filter((b) => !String(b.location || '').trim())
          .map((b) => ({ id: b.id, sala: roomFor(b.title, b.day_of_week, b.start_time) }))
          .filter((b) => b.sala)

        for (const b of porPreencher) {
          const { error: e } = await supabase
            .from('schedule_blocks').update({ location: b.sala }).eq('id', b.id)
          if (e) throw e
        }
        // So aqui: se falhar a meio, a proxima sessao volta a tentar.
        try { sessionStorage.setItem(FEITO, uid) } catch { /* ignore */ }
      } catch (e) {
        // Reparacao em segundo plano: nao vale a pena interromper o aluno com
        // isto, mas tambem nao se engole calada.
        console.error('Não consegui preencher as salas do horário:', errorText(e))
      } finally {
        aDecorrer.delete(uid)
      }
    })()
  }, [uid])
}
