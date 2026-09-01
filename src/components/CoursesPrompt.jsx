import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import EnrollFlow from './EnrollFlow.jsx'

const DISMISS_KEY = 'coursesPromptDismissed'

/**
 * Decide QUANDO perguntar as cadeiras: a seguir ao onboarding, enquanto o aluno
 * nao tiver nenhuma deste ano/semestre. O ecra em si e o EnrollFlow, o mesmo
 * que o Horario abre para quem der skip aqui.
 *
 * Assim que ele mexe, o modal deixa de depender da condicao de entrada: senao
 * uma gravacao que falhasse a meio ja tinha criado cadeiras, a condicao passava
 * a falsa e o modal desaparecia levando o erro com ele.
 */
export default function CoursesPrompt() {
  const { academicYear, semester } = useAuth()
  const { rows: courses, loading } = useCourses()
  const [fechado, setFechado] = useState(false)
  const [comecou, setComecou] = useState(false)

  const ano = Number(academicYear) || null
  const termo = Number(semester) || null
  const jaTem = courses.some((c) => c.year === ano && c.term === termo)
  const adiado = typeof sessionStorage !== 'undefined'
    && sessionStorage.getItem(DISMISS_KEY) === `${ano}-${termo}`

  if (fechado) return null
  if (!comecou && (loading || jaTem || adiado || !ano || !termo)) return null

  return (
    <EnrollFlow
      onStart={() => setComecou(true)}
      onClose={() => {
        try { sessionStorage.setItem(DISMISS_KEY, `${ano}-${termo}`) } catch { /* ignore */ }
        setFechado(true)
      }}
    />
  )
}
