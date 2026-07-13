import { useState } from 'react'
import { useCourses } from '../context/CoursesContext.jsx'
import { COURSE_COLORS } from '../lib/helpers.js'

/**
 * Selector de cadeira reutilizavel. Permite escolher uma cadeira existente
 * ou criar uma nova ali mesmo (sem sair do formulario).
 */
export default function CourseSelect({ value, onChange, allowNone = true }) {
  const { rows: courses, add } = useCourses()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  async function createCourse(e) {
    e.preventDefault()
    if (!name.trim()) return
    const color = COURSE_COLORS[courses.length % COURSE_COLORS.length]
    const created = await add({ name: name.trim(), color, ects: 6 })
    onChange(created.id)
    setName('')
    setCreating(false)
  }

  if (creating) {
    return (
      <div className="flex gap-2">
        <input autoFocus className="input" placeholder="Nome da cadeira"
          value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createCourse(e)} />
        <button type="button" className="btn-primary px-3" onClick={createCourse}>OK</button>
        <button type="button" className="btn-ghost px-3" onClick={() => setCreating(false)}>✕</button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        {allowNone && <option value="">Sem cadeira</option>}
        {courses.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button type="button" className="btn-ghost px-3 whitespace-nowrap" onClick={() => setCreating(true)}>
        + Nova
      </button>
    </div>
  )
}
