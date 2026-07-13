import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { ASSIGNMENT_KINDS, dueLabel, formatDateTime, lighten } from '../lib/helpers.js'

const toneClasses = {
  rose: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
  amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  slate: 'bg-white/10 text-slate-300 border border-white/10',
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
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [tab, setTab] = useState('open') // open | done

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
      <PageHeader title="Prazos" subtitle="Trabalhos, testes e exames" />

      <div className="flex gap-2 mb-4">
        {[['open', 'Por fazer'], ['done', 'Concluidos']].map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2 seg ${tab === v ? 'seg-on' : 'seg-off'}`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState icon="clipboard" title={tab === 'done' ? 'Nada concluido ainda' : 'Sem prazos pendentes'}
          hint={tab === 'done' ? undefined : 'Toca no + para adicionar um trabalho ou exame.'} />
      ) : (
        <div className="space-y-2.5">
          {list.map((a) => {
            const c = courseById[a.course_id]
            const dl = dueLabel(a.due_date)
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
                    <span className="capitalize">{a.kind}</span>
                    {a.due_date && <>· {formatDateTime(a.due_date)}</>}
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

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar prazo' : 'Novo prazo'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Titulo</label>
            <input className="input" required placeholder="Ex: Case study de Marketing"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Cadeira</label>
            <CourseSelect value={form.course_id} onChange={(v) => setForm({ ...form, course_id: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {ASSIGNMENT_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Data limite</label>
              <input type="datetime-local" className="input" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input min-h-[80px]" placeholder="Detalhes, requisitos, links..."
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button className="btn-primary w-full mt-2">{editId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  )
}
