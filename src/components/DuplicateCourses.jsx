import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { useCollection } from '../lib/useCollection.js'
import { duplicateGroups, mergePlan } from '../lib/duplicates.js'
import { errorText } from '../lib/errors.js'
import { Icon, ErrorBox } from './ui.jsx'
import { useT } from '../i18n/index.jsx'

/**
 * Aviso de cadeiras repetidas, com o botão de as juntar.
 *
 * A ordem importa: primeiro muda-se o dono das componentes e das aulas, só
 * depois se apaga a repetida. Ao contrário, apagar levaria as componentes à
 * frente (a base de dados apaga-as em cascata) e as aulas ficariam órfãs.
 * Se falhar a meio, nada se perdeu — só ficou meio mudado, e repetir acaba
 * o trabalho.
 */
export default function DuplicateCourses() {
  const { rows: courses, update: updateCourse, remove: removeCourse, reload: reloadCourses } = useCourses()
  const grades = useCollection('grades', { orderBy: 'created_at', ascending: true })
  const blocks = useCollection('schedule_blocks', { orderBy: 'start_time', ascending: true })
  const { t } = useT()
  const [ajuntar, setAjuntar] = useState(null)   // id do grupo a ser junto
  const [erro, setErro] = useState(null)
  const [feitos, setFeitos] = useState([])       // grupos já juntos nesta visita

  const grupos = duplicateGroups(courses).filter((g) => !feitos.includes(g.key))
  if (!grupos.length && !erro) return null

  // "1 componente e 2 aulas" — cada metade com o seu singular.
  const oQuePassa = (plano) => {
    const partes = []
    if (plano.componentes.length) partes.push(t('dup.movesComp', { n: plano.componentes.length }))
    if (plano.aulas.length) partes.push(t('dup.movesClasses', { n: plano.aulas.length }))
    return partes.length ? t('dup.moves', { o: partes.join(t('common.and')) }) : null
  }

  async function juntar(grupo) {
    const plano = mergePlan(grupo, grades.rows, blocks.rows)
    const detalhe = [
      oQuePassa(plano),
      ...(plano.notasPerdidas.length ? [t('dup.lostGrade', { n: plano.notasPerdidas.join(', ') })] : []),
    ].filter(Boolean).join('\n')
    if (!window.confirm(t('dup.confirm', { name: grupo.principal.name, detalhe }))) return

    setAjuntar(grupo.key); setErro(null)
    try {
      for (const g of plano.componentes) {
        const { error } = await supabase.from('grades').update({ course_id: grupo.principal.id }).eq('id', g.id)
        if (error) throw error
      }
      for (const b of plano.aulas) {
        const { error } = await supabase.from('schedule_blocks').update({ course_id: grupo.principal.id }).eq('id', b.id)
        if (error) throw error
      }
      if (Object.keys(plano.campos).length) await updateCourse(grupo.principal.id, plano.campos)
      for (const c of grupo.extras) await removeCourse(c.id)
      setFeitos((prev) => [...prev, grupo.key])
      await Promise.all([grades.reload(), blocks.reload(), reloadCourses()])
    } catch (e) {
      setErro(errorText(e, t))
    } finally {
      setAjuntar(null)
    }
  }

  return (
    <div className="space-y-2.5 mb-4">
      <ErrorBox error={erro} onClose={() => setErro(null)} />
      {grupos.map((grupo) => {
        const plano = mergePlan(grupo, grades.rows, blocks.rows)
        const n = grupo.extras.length + 1
        return (
          <div key={grupo.key} className="card p-3.5 border-amber-500/25 bg-amber-500/[0.07]">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <Icon name="archive" className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-100">{t('dup.title', { name: grupo.principal.name, n })}</p>
                <p className="text-xs text-amber-100/70 leading-relaxed mt-0.5">{t('dup.body')}</p>
                {oQuePassa(plano) && (
                  <p className="text-xs text-slate-400 mt-1.5">{oQuePassa(plano)}</p>
                )}
              </div>
            </div>
            <button onClick={() => juntar(grupo)} disabled={ajuntar === grupo.key}
              className="btn-primary w-full py-2 text-sm mt-3">
              {ajuntar === grupo.key ? t('common.saving') : t('dup.merge')}
            </button>
          </div>
        )
      })}
    </div>
  )
}
