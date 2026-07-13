import { createContext, useContext } from 'react'
import { useCollection } from '../lib/useCollection.js'

const CoursesContext = createContext(null)

/**
 * Cadeiras sao partilhadas por todas as paginas (horario, prazos, notas, tarefas),
 * por isso vivem num contexto unico carregado uma vez.
 */
export function CoursesProvider({ children }) {
  const courses = useCollection('courses', { orderBy: 'name', ascending: true })
  return <CoursesContext.Provider value={courses}>{children}</CoursesContext.Provider>
}

export const useCourses = () => useContext(CoursesContext)
