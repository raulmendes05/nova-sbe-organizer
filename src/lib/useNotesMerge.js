import { useEffect } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useT } from '../i18n/index.jsx'
import { errorText } from './errors.js'

const FEITO = 'notesMerge.v1'
const aDecorrer = new Set()

/**
 * O separador "Notas & Tarefas" desapareceu — no fundo eram prazos sem data.
 * Isto passa o que cada aluno la tinha para os Prazos, para nada ficar preso
 * numa pagina que ja nao existe.
 *
 * Uma linha de cada vez: so apaga a nota DEPOIS de o prazo entrar. Se falhar a
 * meio, o que sobrar fica na tabela antiga e a proxima sessao continua.
 */
export function useNotesMerge() {
  const { user } = useAuth()
  const { t } = useT()
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
          .from('notes')
          .select('id, title, body, course_id, is_task, done')
          .eq('user_id', uid)
        if (error) throw error

        for (const n of data || []) {
          const primeiraLinha = String(n.body || '').split('\n')[0].trim().slice(0, 80)
          const { error: e1 } = await supabase.from('assignments').insert({
            user_id: uid,
            course_id: n.course_id,
            title: (n.title || '').trim() || primeiraLinha || t('deadlines.untitled'),
            description: n.body || null,
            due_date: null,
            kind: 'outro',
            status: n.done ? 'done' : 'todo',
          })
          if (e1) throw e1
          const { error: e2 } = await supabase.from('notes').delete().eq('id', n.id)
          if (e2) throw e2
        }
        try { sessionStorage.setItem(FEITO, uid) } catch { /* ignore */ }
      } catch (e) {
        console.error('Não consegui passar as notas e tarefas para os prazos:', errorText(e))
      } finally {
        aDecorrer.delete(uid)
      }
    })()
  }, [uid, t])
}
