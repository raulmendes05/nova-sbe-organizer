import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import Tour from './Tour.jsx'

/**
 * Os primeiros passos, logo a seguir ao onboarding: onde se adicionam as
 * cadeiras ao horário e onde se metem as notas das que já estão feitas.
 *
 * Substitui o pop-up que abria a inscrição de caras. Aquele resolvia o
 * primeiro passo mas não dizia ONDE aquilo vivia, e quem lhe desse skip ficava
 * sem saber por onde começar. Aqui aponta-se para os sítios e, no fim, o botão
 * leva mesmo lá.
 */
const PASSOS = [
  { target: '[data-tour="/horario"]', title: 'tour.schedule.title', body: 'tour.schedule.body' },
  { target: '[data-tour="/notas"]', title: 'tour.grades.title', body: 'tour.grades.body' },
]

export default function FirstSteps() {
  const { academicYear, semester, tourDone, updateProfile } = useAuth()
  const { rows: courses, loading } = useCourses()
  const navigate = useNavigate()
  const location = useLocation()
  const [fechado, setFechado] = useState(false)

  // Do Perfil dá para rever a visita mesmo com o percurso já a meio.
  const forcado = Boolean(location.state?.tour)

  if (fechado) return null
  if (!forcado && (loading || tourDone || !academicYear || !semester || courses.length > 0)) return null

  async function terminar() {
    setFechado(true)
    // Se a gravação falhar, a visita volta a aparecer noutra sessão — chato,
    // mas melhor do que prender aqui quem só quer entrar na app.
    try { await updateProfile({ tour_done: 'v1' }) } catch { /* ignore */ }
  }

  return (
    <Tour
      steps={PASSOS}
      onSkip={terminar}
      onFinish={terminar}
      onAction={async () => {
        await terminar()
        navigate('/horario', { state: { enroll: true } })
      }}
    />
  )
}
