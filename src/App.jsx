import { Routes, Route, Navigate } from 'react-router-dom'
import { isConfigured } from './lib/supabase.js'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import { Spinner } from './components/ui.jsx'
import NotConfigured from './pages/NotConfigured.jsx'
import Login from './pages/Login.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Home from './pages/Home.jsx'
import Schedule from './pages/Schedule.jsx'
import Assignments from './pages/Assignments.jsx'
import Grades from './pages/Grades.jsx'
import Notes from './pages/Notes.jsx'
import Exams from './pages/Exams.jsx'
import Claudio from './pages/Claudio.jsx'

export default function App() {
  if (!isConfigured) return <NotConfigured />

  const { user, loading, displayName, academicYear } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nova-800">
        <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    )
  }

  if (!user) return <Login />

  // Primeiro login: pedir nome + ano/semestre antes de mostrar a app
  if (!displayName || !academicYear) return <Onboarding />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/horario" element={<Schedule />} />
        <Route path="/prazos" element={<Assignments />} />
        <Route path="/notas" element={<Grades />} />
        <Route path="/tarefas" element={<Notes />} />
        <Route path="/provas" element={<Exams />} />
        <Route path="/provas/:code" element={<Exams />} />
        <Route path="/claudio" element={<Claudio />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
