import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { assignmentKinds, dueLabel, formatDateTime, lighten, isCourseDone, localeOf } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'
import { upcomingExams, allUpcomingExams } from '../data/exams.js'

const toneClasses = {
  rose: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
  amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  slate: 'bg-white/10 text-slate-300 border border-white/10',
}

const examDayMonth = (iso, lang) => {
  const [y, m, d] = iso.split('-').map(Number)
  const mon = new Date(y, m - 1, d).toLocaleDateString(localeOf(lang), { month: 'short' })
  return { d, mon: mon.replace('.', '') }
}

const empty = { title: '', course_id: null, description: '', due_date: '', kind: 'trabalho', status: 'todo' }

// datetime-local <-> ISO
const toInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16) : '')
const toISO = (local) => (local ? new Date(local).toISOString() : null)

export default function Assignments() {
  const { rows, loading, add, update, remove } = useCollection('assignments', {
    orderBy: 'due_date', ascending: true,
  })
  const { rows: courses } = useCourses()
  const { t, lang } = useT()
  const grades = useCollection('grades', { orderBy: 'created_at', ascending: true })
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [tab, setTab] = useState('open') // open | done
  const [view, setView] = useState('prazos') // prazos | exames
  const [examScope, setExamScope] = useState('minhas') // minhas | todas
  const [examSearch, setExamSearch] = useState('')

  // Só as cadeiras que o aluno ainda vai fazer (sem nota final / não concluídas)
  const pendingCourses = courses.filter(
    (c) => !isCourseDone(c, grades.rows.filter((g) => g.course_id === c.id)))
  const myExams = upcomingExams(pendingCourses)
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const baseExams = examScope === 'todas' ? allUpcomingExams() : myExams
  const exams = examScope === 'todas' && examSearch.trim()
    ? baseExams.filter((e) => norm(e.course).includes(norm(examSearch.trim())))
    : baseExams

  // Choques no mesmo dia só fazem sentido para as minhas cadeiras
  const examClash = new Set()
  if (examScope === 'minhas') {
    const counts = {}
    myExams.forEach((e) => { counts[e.date] = (counts[e.date] || 0) + 1 })
    Object.keys(counts).forEach((k) => { if (counts[k] > 1) examClash.add(k) })
  }

  function openNew() { setForm(empty); setEditId(null); setOpen(true) }
  function openEdit(a) {
    setForm({
      title: a.title, course_id: a.course_id, description: a.description || '',
      due_date: toInput(a.due_date), kind: a.kind || 'trabalho', status: a.status || 'todo',
    })
    setEditId(a.id); setOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    const payload = { ...form, due_date: toISO(form.due_date) }
    if (editId) await update(editId, payload)
    else await add(payload)
    setOpen(false)
  }

  const toggleDone = (a) =>
    update(a.id, { status: a.status === 'done' ? 'todo' : 'done' })

  const list = rows
    .filter((a) => (tab === 'done' ? a.status === 'done' : a.status !== 'done'))
    // por data (sem data no fim)
    .sort((x, y) => {
      if (!x.due_date) return 1
      if (!y.due_date) return -1
      return new Date(x.due_date) - new Date(y.due_date)
    })

  return (
    <div>
      <PageHeader title={t('nav.deadlines')} subtitle={t('deadlines.subtitle')} />

      {/* Seletor principal: Prazos / Exames (cápsula com ícones) */}
      <div className="flex gap-1 p-1 mb-4 rounded-2xl bg-white/[0.04] border border-white/10">
        {[
          { v: 'prazos', label: t('nav.deadlines'), icon: 'clipboard' },
          { v: 'exames', label: t('deadlines.exams'), icon: 'cap', badge: myExams.length },
        ].map((tabItem) => {
          const on = view === tabItem.v
          return (
            <button key={tabItem.v} onClick={() => setView(tabItem.v)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
                on ? 'text-white shadow-glow' : 'text-slate-400 hover:text-slate-200'
              }`}
              style={on ? { backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 100%)' } : undefined}>
              <Icon name={tabItem.icon} className="w-4 h-4" />
              {tabItem.label}
              {tabItem.badge > 0 && <span className={`text-xs ${on ? 'text-nova-100' : 'text-slate-500'}`}>· {tabItem.badge}</span>}
            </button>
          )
        })}
      </div>

      {view === 'exames' ? (
        <>
        {/* As minhas cadeiras vs Todas */}
        <div className="flex gap-2 mb-4">
          {[['minhas', t('deadlines.myCourses')], ['todas', t('deadlines.allCourses')]].map(([v, label]) => {
            const on = examScope === v
            return (
              <button key={v} onClick={() => setExamScope(v)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                  on ? 'bg-nova-500/20 text-nova-100 border-nova-500/30'
                     : 'text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/5'
                }`}>{label}</button>
            )
          })}
        </div>

        {examScope === 'todas' && (
          <input className="input mb-3" placeholder={t('deadlines.searchCourse')}
            value={examSearch} onChange={(e) => setExamSearch(e.target.value)} />
        )}

        {exams.length === 0 ? (
          <EmptyState icon="cap"
            title={examScope === 'minhas' ? t('deadlines.noExams') : (examSearch.trim() ? t('deadlines.noResults') : t('deadlines.noUpcomingExams'))}
            hint={examScope === 'minhas'
              ? t('deadlines.noExamsHint')
              : (examSearch.trim() ? t('deadlines.noResultsHint', { q: examSearch }) : t('deadlines.noUpcomingExamsHint'))} />
        ) : (
          <div className="space-y-2.5">
            {examClash.size > 0 && (
              <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
                ⚠️ {t('deadlines.clashWarning')}
              </div>
            )}
            {exams.map((e, i) => {
              const dl = dueLabel(e.when, t)
              const { d, mon } = examDayMonth(e.date, lang)
              const clash = examClash.has(e.date)
              return (
                <div key={i} className={`card p-3.5 flex items-center gap-3.5 ${clash ? 'border-amber-500/30' : ''}`}>
                  <div className="w-11 text-center flex-shrink-0">
                    <p className="text-lg font-bold text-nova-200 leading-none">{d}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5">{mon}</p>
                  </div>
                  <div className="w-px self-stretch bg-white/10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{e.course}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t(`examType.${e.type}`)} · {e.time}
                      {clash && <span className="text-amber-300"> · ⚠️ {t('deadlines.sameDay')}</span>}
                    </p>
                  </div>
                  <span className={`chip ${toneClasses[dl.tone]}`}>{dl.text}</span>
                </div>
              )
            })}
            <p className="text-[11px] text-slate-500 text-center pt-1">{t('deadlines.officialCalendar')}</p>
          </div>
        )}
        </>
      ) : loading ? (
        <Spinner />
      ) : (
      <>
      <div className="flex gap-2 mb-4">
        {[['open', t('deadlines.todo')], ['done', t('deadlines.done')]].map(([v, label]) => {
          const on = tab === v
          return (
            <button key={v} onClick={() => setTab(v)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                on ? 'bg-nova-500/20 text-nova-100 border-nova-500/30'
                   : 'text-slate-400 border-white/10 hover:text-slate-200 hover:bg-white/5'
              }`}>{label}</button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState icon="clipboard" title={tab === 'done' ? t('deadlines.emptyDone') : t('deadlines.emptyTodo')}
          hint={tab === 'done' ? undefined : t('deadlines.emptyTodoHint')} />
      ) : (
        <div className="space-y-2.5">
          {list.map((a) => {
            const c = courseById[a.course_id]
            const dl = dueLabel(a.due_date, t)
            const done = a.status === 'done'
            return (
              <div key={a.id} className="card p-3.5 flex items-start gap-3">
                <button onClick={() => toggleDone(a)}
                  className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition ${
                    done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/25 text-transparent'
                  }`}>
                  <Icon name="check" className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 min-w-0" onClick={() => openEdit(a)}>
                  <p className={`font-semibold ${done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{a.title}</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    {c && <span className="chip" style={{ background: (c.color || '#3d78bf') + '2e', color: lighten(c.color) }}>{c.name}</span>}
                    <span>{t(`kind.assignment.${a.kind}`)}</span>
                    {a.due_date && <>· {formatDateTime(a.due_date, lang)}</>}
                  </p>
                </div>
                {!done && a.due_date && <span className={`chip ${toneClasses[dl.tone]}`}>{dl.text}</span>}
                <button onClick={() => remove(a.id)} className="p-1.5 text-slate-500 hover:text-rose-400 flex-shrink-0">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Fab onClick={openNew} />
      </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('deadlines.edit') : t('deadlines.new')}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">{t('common.title')}</label>
            <input className="input" required placeholder={t('deadlines.titlePlaceholder')}
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('common.course')}</label>
            <CourseSelect value={form.course_id} onChange={(v) => setForm({ ...form, course_id: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('common.kind')}</label>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {assignmentKinds(t).map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{t('deadlines.dueDate')}</label>
              <input type="datetime-local" className="input" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">{t('deadlines.notes')}</label>
            <textarea className="input min-h-[80px]" placeholder={t('deadlines.notesPlaceholder')}
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn-primary w-full mt-2">{editId ? t('common.save') : t('common.add')}</button>
        </form>
      </Modal>
    </div>
  )
}
