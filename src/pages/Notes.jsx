import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { lighten } from '../lib/helpers.js'

const empty = { title: '', body: '', course_id: null, is_task: false, done: false }

export default function Notes() {
  const { rows, loading, add, update, remove } = useCollection('notes', {
    orderBy: 'created_at', ascending: false,
  })
  const { rows: courses } = useCourses()
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [tab, setTab] = useState('all') // all | tasks | notes

  function openNew(asTask = false) { setForm({ ...empty, is_task: asTask }); setEditId(null); setOpen(true) }
  function openEdit(n) {
    setForm({ title: n.title || '', body: n.body || '', course_id: n.course_id, is_task: n.is_task, done: n.done })
    setEditId(n.id); setOpen(true)
  }
  async function save(e) {
    e.preventDefault()
    if (editId) await update(editId, form)
    else await add(form)
    setOpen(false)
  }
  const toggleDone = (n) => update(n.id, { done: !n.done })

  const tasks = rows.filter((n) => n.is_task)
  const notes = rows.filter((n) => !n.is_task)
  const openTasks = tasks.filter((t) => !t.done).length

  const visible = tab === 'tasks' ? tasks : tab === 'notes' ? notes : rows

  return (
    <div>
      <PageHeader title="Notas & Tarefas" subtitle={`${openTasks} tarefa(s) por fazer`} />

      <div className="flex gap-2 mb-4">
        {[['all', 'Tudo'], ['tasks', 'Tarefas'], ['notes', 'Notas']].map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2 seg ${tab === v ? 'seg-on' : 'seg-off'}`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState icon="note" title="Nada por aqui" hint="Toca no + para uma nota ou tarefa rapida." />
      ) : (
        <div className="space-y-2.5">
          {visible.map((n) => {
            const c = courseById[n.course_id]
            return (
              <div key={n.id} className="card p-3.5 flex items-start gap-3">
                {n.is_task ? (
                  <button onClick={() => toggleDone(n)}
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition ${
                      n.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/25 text-transparent'
                    }`}>
                    <Icon name="check" className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="mt-1 text-nova-300 flex-shrink-0"><Icon name="note" className="w-5 h-5" /></div>
                )}

                <div className="flex-1 min-w-0" onClick={() => openEdit(n)}>
                  {n.title && <p className={`font-semibold ${n.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>{n.title}</p>}
                  {n.body && <p className={`text-sm whitespace-pre-wrap ${n.done ? 'text-slate-600' : 'text-slate-400'} ${n.title ? 'mt-0.5' : ''}`}>{n.body}</p>}
                  {c && (
                    <span className="chip mt-1.5" style={{ background: (c.color || '#3d78bf') + '2e', color: lighten(c.color) }}>{c.name}</span>
                  )}
                </div>
                <button onClick={() => remove(n.id)} className="p-1.5 text-slate-500 hover:text-rose-400 flex-shrink-0">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Fab onClick={() => openNew(tab === 'notes' ? false : true)} />

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar' : 'Novo'}>
        <form onSubmit={save} className="space-y-3">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm({ ...form, is_task: true })}
              className={`py-2.5 seg ${form.is_task ? 'seg-on' : 'seg-off'}`}>
              ✓ Tarefa
            </button>
            <button type="button" onClick={() => setForm({ ...form, is_task: false })}
              className={`py-2.5 seg ${!form.is_task ? 'seg-on' : 'seg-off'}`}>
              📝 Nota
            </button>
          </div>
          <div>
            <label className="label">Titulo</label>
            <input className="input" placeholder={form.is_task ? 'O que tens de fazer?' : 'Titulo da nota'}
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{form.is_task ? 'Detalhes (opcional)' : 'Conteudo'}</label>
            <textarea className="input min-h-[100px]" placeholder="Escreve aqui..."
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div>
            <label className="label">Cadeira (opcional)</label>
            <CourseSelect value={form.course_id} onChange={(v) => setForm({ ...form, course_id: v })} />
          </div>
          <button className="btn-primary w-full mt-2">{editId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  )
}
