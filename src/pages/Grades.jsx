import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import CoursePicker from '../components/CoursePicker.jsx'
import { COURSE_COLORS, gradedWeight, resolveGrade, termLabel, termKey, simulateGrade } from '../lib/helpers.js'

const YEAR_OPTS = [1, 2, 3]
const TERM_OPTS = [1, 2]

function gradeColor(avg) {
  if (avg === null) return 'text-slate-500'
  if (avg < 9.5) return 'text-rose-400'
  if (avg < 14) return 'text-amber-400'
  return 'text-emerald-400'
}

export default function Grades() {
  const { rows: courses, add: addCourse, update: updateCourse, remove: removeCourse, loading: coursesLoading } = useCourses()
  const { rows: grades, loading: gradesLoading, add: addGrade, update: updateGrade, remove: removeGrade } = useCollection('grades', { orderBy: 'created_at', ascending: true })
  const { academicYear, semester } = useAuth()
  const defYear = Number(academicYear) || null
  const defTerm = Number(semester) || null

  const [tab, setTab] = useState('semesters') // semesters | equivalences
  const [expanded, setExpanded] = useState(null)
  const [openGroups, setOpenGroups] = useState(() => new Set([termKey(defYear, defTerm)]))
  const toggleGroup = (k) => setOpenGroups((prev) => {
    const next = new Set(prev)
    next.has(k) ? next.delete(k) : next.add(k)
    return next
  })
  const [finalDraft, setFinalDraft] = useState('')
  const [showComps, setShowComps] = useState(false)
  const [simTarget, setSimTarget] = useState('') // objetivo do simulador (0-20)
  const [courseModal, setCourseModal] = useState(false)
  const [courseForm, setCourseForm] = useState({ name: '', code: '', ects: 6, professor: '', year: null, term: null, is_equivalence: false })
  const [courseEditId, setCourseEditId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const existingCodes = new Set(courses.map((c) => c.code).filter(Boolean))

  const [gradeModal, setGradeModal] = useState(false)
  const [gradeForm, setGradeForm] = useState({ course_id: null, title: '', weight: '', grade: '' })
  const [gradeEditId, setGradeEditId] = useState(null)

  const compsOf = (courseId) => grades.filter((g) => g.course_id === courseId)

  function toggleExpand(c) {
    const open = expanded === c.id
    setExpanded(open ? null : c.id)
    setShowComps(false)
    setFinalDraft(open ? '' : (c.final_grade ?? null) === null ? '' : String(c.final_grade))
  }

  async function saveFinal(c) {
    const v = finalDraft === '' ? null : Number(finalDraft)
    const cur = c.final_grade ?? null
    if (v === cur) return
    await updateCourse(c.id, { final_grade: v })
  }

  // Equivalencias vao para um separador proprio, mas contam para a media/ECTS
  const perCourse = courses.map((c) => ({ c, avg: resolveGrade(c, compsOf(c.id)) }))
  const regular = perCourse.filter((x) => !x.c.is_equivalence)
  const equivalences = perCourse.filter((x) => x.c.is_equivalence)

  // Media global — todas as cadeiras com nota (incl. equivalencias)
  const withAvg = perCourse.filter((x) => x.avg !== null)
  const totalEcts = withAvg.reduce((s, x) => s + Number(x.c.ects || 0), 0)
  const globalAvg = totalEcts > 0
    ? withAvg.reduce((s, x) => s + x.avg * Number(x.c.ects || 0), 0) / totalEcts
    : null

  // Agrupar regulares por ano/semestre
  const groups = Object.values(
    regular.reduce((acc, item) => {
      const k = termKey(item.c.year, item.c.term)
      if (!acc[k]) acc[k] = { key: k, label: termLabel(item.c.year, item.c.term), items: [] }
      acc[k].items.push(item)
      return acc
    }, {})
  ).sort((a, b) => a.key - b.key)

  // ----- cadeira -----
  function openNewCourse(isEquiv = false) {
    setCourseForm({ name: '', code: '', ects: 6, professor: '', year: isEquiv ? null : defYear, term: isEquiv ? null : defTerm, is_equivalence: isEquiv })
    setCourseEditId(null); setCourseModal(true)
  }
  function openEditCourse(c) {
    setCourseForm({ name: c.name, code: c.code || '', ects: c.ects ?? 6, professor: c.professor || '', year: c.year ?? null, term: c.term ?? null, is_equivalence: c.is_equivalence ?? false })
    setCourseEditId(c.id); setCourseModal(true)
  }

  async function pickFromCatalog(course) {
    const color = COURSE_COLORS[courses.length % COURSE_COLORS.length]
    await addCourse({ name: course.name, code: course.code, ects: course.ects, color, year: defYear, term: defTerm })
  }
  function openManual() { setPickerOpen(false); openNewCourse(false) }

  async function saveCourse(e) {
    e.preventDefault()
    const payload = { ...courseForm, ects: Number(courseForm.ects) || 0 }
    if (payload.is_equivalence) { payload.year = null; payload.term = null }
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

  // FAB: catalogo (semestres) ou formulario de equivalencia
  function onFab() {
    if (tab === 'equivalences') openNewCourse(true)
    else setPickerOpen(true)
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

  // ----- cartao de uma cadeira (reutilizado nos dois separadores) -----
  function courseCard({ c, avg }) {
    const comps = compsOf(c.id)
    const gw = gradedWeight(comps)
    const isOpen = expanded === c.id
    const usesComponents = (c.final_grade ?? null) === null && comps.length > 0
    return (
      <div key={c.id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
        <button onClick={() => toggleExpand(c)} className="w-full p-3.5 flex items-center gap-3 text-left">
          <div className="w-1.5 h-10 rounded-full" style={{ background: c.color || '#3d78bf', boxShadow: `0 0 10px ${c.color || '#3d78bf'}55` }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 truncate">{c.name}</p>
            <p className="text-xs text-slate-400">
              {c.ects} ECTS{usesComponents && <> · {gw}% avaliado</>}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold ${gradeColor(avg)}`}>{avg !== null ? avg.toFixed(1) : '—'}</p>
          </div>
        </button>

        {isOpen && (
          <div className="border-t border-white/10 p-3.5 bg-white/[0.02] space-y-3.5">
            <div>
              <label className="label">Nota final (0–20)</label>
              <input type="number" step="0.1" min="0" max="20" inputMode="decimal"
                className="input text-lg font-semibold" placeholder="Ainda sem nota"
                value={finalDraft}
                onChange={(e) => setFinalDraft(e.target.value)}
                onBlur={() => saveFinal(c)} />
            </div>

            <div>
              <button onClick={() => setShowComps(!showComps)}
                className="w-full flex items-center justify-between text-sm text-slate-300 hover:text-white py-1">
                <span className="font-medium">Detalhar por componentes {usesComponents && <span className="text-slate-500">(a contar)</span>}</span>
                <span className={`transition ${showComps ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {showComps && (
                <div className="mt-1.5">
                  <p className="text-xs text-slate-500 mb-2">
                    Se tiveres nota final acima, os componentes servem só para simular. Sem nota final, a média vem daqui.
                  </p>
                  {comps.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {comps.map((g) => (
                        <div key={g.id} className="flex items-center gap-2 bg-white/[0.05] border border-white/5 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0" onClick={() => openEditGrade(g)}>
                            <p className="text-sm font-medium text-slate-200 truncate">{g.title}</p>
                            <p className="text-xs text-slate-500">peso {g.weight}%</p>
                          </div>
                          <span className={`font-bold ${g.grade === null ? 'text-slate-500' : gradeColor(Number(g.grade))}`}>
                            {g.grade === null ? '—' : Number(g.grade).toFixed(1)}
                          </span>
                          <button onClick={() => removeGrade(g.id)} className="p-1 text-slate-500 hover:text-rose-400">
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => openNewGrade(c.id)} className="btn-ghost w-full py-2 text-sm">
                    <Icon name="plus" className="w-4 h-4" /> Adicionar componente
                  </button>

                  {/* Simulador — que nota preciso? */}
                  {comps.length > 0 && (() => {
                    const pass = simulateGrade(comps, 9.5)
                    const goal = simTarget !== '' && !isNaN(Number(simTarget)) ? simulateGrade(comps, Number(simTarget)) : null
                    const line = (sim) => {
                      if (!sim || sim.done) return { txt: 'Todas as componentes já têm nota — média fechada.', cls: 'text-slate-400' }
                      if (sim.guaranteed) return { txt: `✅ Já garantido — mesmo com 0 no resto ficas acima.`, cls: 'text-emerald-300' }
                      if (sim.impossible) return { txt: `❌ Já não dá — precisavas de mais de 20 nos ${sim.remainingPct}% que faltam.`, cls: 'text-rose-300' }
                      return { txt: `Precisas de ${sim.needed.toFixed(1)} nos ${sim.remainingPct}% que faltam.`, cls: 'text-slate-100' }
                    }
                    const p = line(pass)
                    const g = goal ? line(goal) : null
                    return (
                      <div className="mt-3 rounded-xl bg-nova-500/10 border border-nova-500/25 p-3">
                        <p className="text-xs font-semibold text-nova-200 mb-2">🎯 Simulador — que nota preciso?</p>
                        <p className={`text-sm ${p.cls}`}><span className="text-slate-400">Para passar (9,5):</span> {p.txt}</p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <label className="text-sm text-slate-400">Objetivo:</label>
                          <input type="number" step="0.5" min="0" max="20" inputMode="decimal"
                            className="input w-20 py-1.5 text-sm" placeholder="ex. 16"
                            value={simTarget} onChange={(e) => setSimTarget(e.target.value)} />
                          <span className="text-sm text-slate-500">/ 20</span>
                        </div>
                        {g && <p className={`text-sm mt-2 ${g.cls}`}><span className="text-slate-400">Para {Number(simTarget)}:</span> {g.txt}</p>}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => openEditCourse(c)} className="btn-ghost flex-1 py-2 text-sm">
                <Icon name="edit" className="w-4 h-4" /> Editar cadeira
              </button>
              <button onClick={() => deleteCourse(c.id)} className="btn-ghost px-3 py-2 text-sm text-rose-400">
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Notas" subtitle="Escala 0–20 · média ponderada por ECTS" />

      {/* Cartao media global */}
      <div className="relative overflow-hidden rounded-3xl p-5 mb-4 shadow-glow"
        style={{ backgroundImage: 'linear-gradient(135deg, #1f5aa3 0%, #0f3663 55%, #0a2540 100%)' }}>
        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-accent-400/20 blur-2xl" />
        <div className="relative">
          <p className="text-nova-100/90 text-sm font-medium">Média global · ponderada por ECTS</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-5xl font-bold text-white tracking-tight">{globalAvg !== null ? globalAvg.toFixed(2) : '—'}</span>
            <span className="text-nova-200 mb-1.5 font-medium">/ 20</span>
          </div>
          <p className="text-nova-200/80 text-xs mt-2">
            {withAvg.length} de {courses.length} cadeiras com notas · {totalEcts} ECTS
          </p>
        </div>
      </div>

      {/* Separadores */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('semesters')} className={`flex-1 py-2 seg ${tab === 'semesters' ? 'seg-on' : 'seg-off'}`}>Semestres</button>
        <button onClick={() => setTab('equivalences')} className={`flex-1 py-2 seg ${tab === 'equivalences' ? 'seg-on' : 'seg-off'}`}>
          Equivalências{equivalences.length > 0 && <span className="ml-1 opacity-70">· {equivalences.length}</span>}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'semesters' ? (
        groups.length === 0 ? (
          <EmptyState icon="chart" title="Ainda sem cadeiras" hint="Toca no + para adicionar do catálogo Nova SBE." />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const open = openGroups.has(group.key)
              const graded = group.items.filter((x) => x.avg !== null)
              const gEcts = graded.reduce((s, x) => s + Number(x.c.ects || 0), 0)
              const gAvg = gEcts > 0 ? graded.reduce((s, x) => s + x.avg * Number(x.c.ects || 0), 0) / gEcts : null
              return (
                <section key={group.key} className="card overflow-hidden">
                  <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-100">{group.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {group.items.length} cadeira{group.items.length !== 1 ? 's' : ''}
                        {gAvg !== null && <> · média <span className={gradeColor(gAvg)}>{gAvg.toFixed(1)}</span></>}
                      </p>
                    </div>
                    <span className={`text-slate-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {open && (
                    <div className="border-t border-white/10 p-2.5 space-y-2.5 bg-white/[0.02]">
                      {group.items.map(courseCard)}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )
      ) : (
        // Separador Equivalências
        equivalences.length === 0 ? (
          <EmptyState icon="note" title="Sem equivalências" hint="Cadeiras creditadas de outra universidade. Toca no + para adicionar." />
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-500 px-0.5">Cadeiras creditadas de outra universidade. Contam para a média global e ECTS.</p>
            {equivalences.map(courseCard)}
          </div>
        )
      )}

      <Fab onClick={onFab} label={tab === 'equivalences' ? 'Nova equivalência' : 'Nova cadeira'} />

      {/* Modal cadeira */}
      <Modal open={courseModal} onClose={() => setCourseModal(false)} title={courseEditId ? 'Editar cadeira' : courseForm.is_equivalence ? 'Nova equivalência' : 'Nova cadeira'}>
        <form onSubmit={saveCourse} className="space-y-3">
          <div>
            <label className="label">Nome{courseForm.code && <span className="text-slate-500 font-normal"> · #{courseForm.code}</span>}</label>
            <input className="input" required placeholder="Ex: Financial Accounting"
              value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} />
          </div>

          {/* Equivalencia */}
          <button type="button" onClick={() => setCourseForm({ ...courseForm, is_equivalence: !courseForm.is_equivalence })}
            className="w-full flex items-center gap-3 text-left rounded-xl bg-white/[0.05] border border-white/10 p-3">
            <span className={`w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition ${courseForm.is_equivalence ? 'bg-accent-500 border-accent-500' : 'border-white/30'}`}>
              {courseForm.is_equivalence && <Icon name="check" className="w-4 h-4 text-white" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-100">Equivalência de outra universidade</span>
              <span className="block text-xs text-slate-500">Fica no separador Equivalências. Conta para a média e ECTS.</span>
            </span>
          </button>

          {!courseForm.is_equivalence && (
            <>
              <div>
                <label className="label">Ano</label>
                <div className="grid grid-cols-3 gap-2">
                  {YEAR_OPTS.map((y) => (
                    <button type="button" key={y} onClick={() => setCourseForm({ ...courseForm, year: y })}
                      className={`py-2 seg ${courseForm.year === y ? 'seg-on' : 'seg-off'}`}>{y}º ano</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Semestre</label>
                <div className="grid grid-cols-2 gap-2">
                  {TERM_OPTS.map((t) => (
                    <button type="button" key={t} onClick={() => setCourseForm({ ...courseForm, term: courseForm.term === t ? null : t })}
                      className={`py-2 seg ${courseForm.term === t ? 'seg-on' : 'seg-off'}`}>{t}º semestre</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ECTS</label>
              <input type="number" step="0.5" min="0" className="input"
                value={courseForm.ects} onChange={(e) => setCourseForm({ ...courseForm, ects: e.target.value })} />
            </div>
            <div>
              <label className="label">Professor</label>
              <input className="input" placeholder="opcional" value={courseForm.professor}
                onChange={(e) => setCourseForm({ ...courseForm, professor: e.target.value })} />
            </div>
          </div>
          <button className="btn-primary w-full mt-2">{courseEditId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>

      {/* Catalogo Nova SBE */}
      <CoursePicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        onPick={pickFromCatalog} onManual={openManual} existingCodes={existingCodes} defaultProgram="management" />

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
          <p className="text-xs text-slate-400">Deixa a nota vazia se ainda não saiu — o peso conta para a percentagem avaliada.</p>
          <button className="btn-primary w-full mt-2">{gradeEditId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  )
}
