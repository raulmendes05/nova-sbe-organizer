import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'
import { CoursesProvider } from '../context/CoursesContext.jsx'

export default function Layout() {
  return (
    <CoursesProvider>
      <div className="min-h-screen max-w-md mx-auto relative">
        <main className="px-4 pt-16 pb-28 safe-top">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </CoursesProvider>
  )
}
