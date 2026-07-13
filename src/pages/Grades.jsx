import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import { COURSE_COLORS, courseAverage, gradedWeight } from '../lib/helpers.js'

function gradeColor(avg) {
  if (avg === null) return 'text-slate-400'
  if (avg < 9.5) return 'text-rose-600'
  if (avg < 14) return 'text-amber-600'
  return 'text-emerald-600'
}

export default function Grades() {
  const { rows: courses, add: addCourse, update: updateCourse, remove: removeCourse, loading: coursesLoading } = useCourses()
  const { rows: grades, loading: gradesLoading, add: addGrade, update: updateGrade, remove: removeGrade } = useCollection('grades', { orderBy: 'created_at', ascending: true })

  const [expanded, setExpanded] = useState(null)
  const [courseModal, setCourseModal] = useState(false)
  const [courseForm, setCourseForm] = useState({ name: '', ects: 6, professor: '', semester: '' })
  const [courseEditId, setCourseEditId] = useState(null)

  const [gradeModal, setGradeModal] = useState(false)
  const [gradeForm, setGradeForm] = useState({ course_id: null, title: '', weight: '', grade: '' })
  const [gradeEditId, setGradeEditId] = useState(null)

  const compsOf = (courseId) => grades.filter((g) => g.course_id === courseId)

  // Media global ponderada por ECTS
  const perCourse = courses.map((c) => ({ c, avg: courseAverage(compsOf(c.id)) }))
  const withAvg = perCourse.filter((x) => x.avg !== null)
  const totalEcts = withAvg.reduce((s, x) => s + Number(x.c.ects || 0), 0)
  const globalAvg = totalEcts > 0
    ? withAvg.reduce((s, x) => s + x.avg * Number(x.c.ects || 0), 0) / totalEcts
    : null

  // ----- cadeira -----
  function openNewCourse() { setCourseForm({ name: '', ects: 6, professor: '', semester: '' }); setCourseEditId(null); setCourseModal(true) }
  function openEditCourse(c) { setCourseForm({ name: c.name, ects: c.ects ?? 6, professor: c.professor || '', semester: c.semester || '' }); setCourseEditId(c.id); setCourseModal(true) }
  async function saveCourse(e) {
    e.preventDefault()
    const payload = { ...courseForm, ects: Number(courseForm.ects) || 0 }
    if (courseEditId) await updateCourse(courseEditId, payload)
    else {
      payload.color = COURSE_COLORS[courses.length % COURSE_COLORS.length]
      await addCourse(payload)
    }
    setCourseModal(false)
  }
  async function deleteCourse(id) {
    if (!confirm('Apagar a cadeira e todas as suas notas?')) return
    await removeCourse(id)
  }

  // ----- componente de avaliacao -----
  function openNewGrade(courseId) { setGradeForm({ course_id: courseId, title: '', weight: '', grade: '' }); setGradeEditId(null); setGradeModal(true) }
  function openEditGrade(g) { setGradeForm({ course_id: g.course_id, title: g.title, weight: g.weight ?? '', grade: g.grade ?? '' }); setGradeEditId(g.id); setGradeModal(true) }
  async function saveGrade(e) {
    e.preventDefault()
    const payload = {
      course_id: gradeForm.course_id,
      title: gradeForm.title,
      weight: Number(gradeForm.weight) || 0,
      grade: gradeForm.grade === '' ? null : Number(gradeForm.grade),
    }
    if (gradeEditId) await updateGrade(gradeEditId, payload)
    else await addGrade(payload)
    setGradeModal(false)
  }

  const loading = coursesLoading || gradesLoading

  return (
    <div>
      <PageHeader title="Notas" subtitle="Escala 0–20 · media ponderada por ECTS" />

      {/* Cartao media global */}
      <div className="card p-5 mb-5 bg-gradient-to-br from-nova-700 to-nova-800 text-white border-0">
        <p className="text-nova-100 text-sm">Media global (ponderada por ECTS)</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-4xl font-bold">{globalAvg !== null ? globalAvg.toFixed(2) : '—'}</span>
          <span className="text-nova-200 mb-1">/ 20</span>
        </div>
        <p className="text-nova-200 text-xs mt-1">
          {withAvg.length} de {courses.length} cadeiras com notas · {totalEcts} ECTS
        </p>
      </div>

      {loading ? (
        <Spinner />
      ) : courses.length === 0 ? (
        <EmptyState icon="chart" title="Ainda sem cadeiras" hint="Toca no + para adicionar a primeira cadeira." />
      ) : (
        <div className="space-y-2.5">
          {perCourse.map(({ c, avg }) => {
            const comps = compsOf(c.id)
            const gw = gradedWeight(comps)
            const isOpen = expanded === c.id
            return (
              <div key={c.id} className="card overflow-hidden">
                <button onClick={() => setExpanded(isOpen ? null : c.id)} className="w-full p-3.5 flex items-center gap-3 text-left">
                  <div className="w-1.5 h-10 rounded-full" style={{ background: c.color || '#1f5aa3' }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.ects} ECTS · {gw}% avaliado</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${gradeColor(avg)}`}>{avg !== null ? avg.toFixed(1) : '—'}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-3 bg-slate-50/60">
                    {comps.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-3">Sem componentes de avaliacao.</p>
                    ) : (
                      <div className="space-y-1.5 mb-3">
                        {comps.map((g) => (
                          <div key={g.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0" onClick={() => openEditGrade(g)}>
                              <p className="text-sm font-medium text-slate-700 truncate">{g.title}</p>
                              <p className="text-xs text-slate-400">peso {g.weight}%</p>
                            </div>
                            <span className={`font-bold ${g.grade === null ? 'text-slate-300' : gradeColor(Number(g.grade))}`}>
                              {g.grade === null ? '—' : Number(g.grade).toFixed(1)}
                            </span>
                            <button onClick={() => removeGrade(g.id)} className="p-1 text-slate-300 hover:text-rose-500">
                              <Icon name="trash" className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => openNewGrade(c.id)} className="btn-ghost flex-1 py-2 text-sm">
                        <Icon name="plus" className="w-4 h-4" /> Componente
                      </button>
                      <button onClick={() => openEditCourse(c)} className="btn-ghost px-3 py-2 text-sm">
                        <Icon name="edit" className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteCourse(c.id)} className="btn-ghost px-3 py-2 text-sm text-rose-500">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Fab onClick={openNewCourse} label="Nova cadeira" />

      {/* Modal cadeira */}
      <Modal open={courseModal} onClose={() => setCourseModal(false)} title={courseEditId ? 'Editar cadeira' : 'Nova cadeira'}>
        <form onSubmit={saveCourse} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" required placeholder="Ex: Financial Accounting"
              value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ECTS</label>
              <input type="number" step="0.5" min="0" className="input"
                value={courseForm.ects} onChange={(e) => setCourseForm({ ...courseForm, ects: e.target.value })} />
            </div>
            <div>
              <label className="label">Semestre</label>
              <input className="input" placeholder="Ex: 1o Sem"
                value={courseForm.semester} onChange={(e) => setCourseForm({ ...courseForm, semester: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Professor (opcional)</label>
            <input className="input" value={courseForm.professor}
              onChange={(e) => setCourseForm({ ...courseForm, professor: e.target.value })} />
          </div>
          <button className="btn-primary w-full mt-2">{courseEditId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>

      {/* Modal componente */}
      <Modal open={gradeModal} onClose={() => setGradeModal(false)} title={gradeEditId ? 'Editar componente' : 'Novo componente'}>
        <form onSubmit={saveGrade} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" required placeholder="Ex: Exame Final"
              value={gradeForm.title} onChange={(e) => setGradeForm({ ...gradeForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Peso (%)</label>
              <input type="number" step="1" min="0" max="100" className="input" required placeholder="40"
                value={gradeForm.weight} onChange={(e) => setGradeForm({ ...gradeForm, weight: e.target.value })} />
            </div>
            <div>
              <label className="label">Nota (0–20)</label>
              <input type="number" step="0.1" min="0" max="20" className="input" placeholder="ainda sem nota"
                value={gradeForm.grade} onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Deixa a nota vazia se ainda nao saiu — o peso conta para a percentagem avaliada.</p>
          <button className="btn-primary w-full mt-2">{gradeEditId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  )
}
