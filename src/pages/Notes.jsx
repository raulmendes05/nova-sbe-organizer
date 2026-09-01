import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon, ErrorBox } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { lighten } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

const empty = { title: '', body: '', course_id: null, is_task: false, done: false }

export default function Notes() {
  const { rows, loading, error, clearError, add, update, remove } = useCollection('notes', {
    orderBy: 'created_at', ascending: false,
  })
  const { rows: courses } = useCourses()
  const { t } = useT()
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
    try {
      if (editId) await update(editId, form)
      else await add(form)
      setOpen(false)
    } catch { /* o useCollection ja pos a mensagem em `error` — o modal fica aberto */ }
  }
  // O .catch e so para nao ficar uma rejeicao por tratar: a mensagem ja foi
  // parar ao `error` do useCollection e aparece na ErrorBox.
  const toggleDone = (n) => update(n.id, { done: !n.done }).catch(() => {})

  const tasks = rows.filter((n) => n.is_task)
  const notes = rows.filter((n) => !n.is_task)
  const openTasks = tasks.filter((t) => !t.done).length

  const visible = tab === 'tasks' ? tasks : tab === 'notes' ? notes : rows

  return (
    <div>
      <PageHeader title={t('notes.title')} subtitle={t('notes.subtitle', { n: openTasks })} />

      <ErrorBox error={error} onClose={clearError} className="mb-4" />

      <div className="flex gap-2 mb-4">
        {[['all', t('notes.all')], ['tasks', t('nav.tasks')], ['notes', t('notes.notes')]].map(([v, label]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex-1 py-2 seg ${tab === v ? 'seg-on' : 'seg-off'}`}>{label}</button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState icon="note" title={t('notes.emptyTitle')} hint={t('notes.emptyHint')} />
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
                <button onClick={() => remove(n.id).catch(() => {})} className="p-1.5 text-slate-500 hover:text-rose-400 flex-shrink-0">
                  <Icon name="trash" className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Fab onClick={() => openNew(tab === 'notes' ? false : true)} />

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('common.edit') : t('common.new')}>
        <form onSubmit={save} className="space-y-3">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm({ ...form, is_task: true })}
              className={`py-2.5 seg ${form.is_task ? 'seg-on' : 'seg-off'}`}>
              ✓ {t('notes.task')}
            </button>
            <button type="button" onClick={() => setForm({ ...form, is_task: false })}
              className={`py-2.5 seg ${!form.is_task ? 'seg-on' : 'seg-off'}`}>
              📝 {t('notes.note')}
            </button>
          </div>
          <div>
            <label className="label">{t('common.title')}</label>
            <input className="input" placeholder={form.is_task ? t('notes.taskPlaceholder') : t('notes.notePlaceholder')}
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{form.is_task ? t('notes.details') : t('notes.content')}</label>
            <textarea className="input min-h-[100px]" placeholder={t('notes.bodyPlaceholder')}
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('notes.courseOptional')}</label>
            <CourseSelect value={form.course_id} onChange={(v) => setForm({ ...form, course_id: v })} />
          </div>
          <ErrorBox error={error} onClose={clearError} />
          <button className="btn-primary w-full mt-2">{editId ? t('common.save') : t('common.add')}</button>
        </form>
      </Modal>
    </div>
  )
}
