import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'
import SideNav from './SideNav.jsx'
import GoalPrompt from './GoalPrompt.jsx'
import CoursesPrompt from './CoursesPrompt.jsx'
import { CoursesProvider } from '../context/CoursesContext.jsx'
import { useRoomBackfill } from '../lib/useRoomBackfill.js'
import { useNotesMerge } from '../lib/useNotesMerge.js'

export default function Layout() {
  // As salas so foram publicadas a meio do semestre: preenche as que faltam
  // nos horarios ja criados.
  useRoomBackfill()
  // O separador "Notas & Tarefas" saiu: o que la estava passa para os Prazos.
  useNotesMerge()

  return (
    <CoursesProvider>
      <div className="min-h-screen md:flex">
        {/* Barra lateral (só computador) */}
        <SideNav />

        {/* Conteúdo: estreito no telemóvel, mais largo e centrado no computador */}
        <div className="flex-1 min-w-0">
          <main className="mx-auto w-full max-w-md md:max-w-3xl px-4 md:px-8 pt-16 md:pt-10 pb-28 md:pb-12 safe-top">
            <Outlet />
          </main>
        </div>

        {/* Barra inferior (só telemóvel) */}
        <BottomNav />
      </div>
      <CoursesPrompt />
      <GoalPrompt />
    </CoursesProvider>
  )
}
