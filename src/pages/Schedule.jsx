import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { DAYS, SCHEDULE_KINDS, hhmm, todayDow } from '../lib/helpers.js'

const empty = {
  title: '', course_id: null, day_of_week: todayDow(),
  start_time: '09:00', end_time: '10:30', location: '', kind: 'aula',
}

export default function Schedule() {
  const { rows, loading, add, update, remove } = useCollection('schedule_blocks', {
    orderBy: 'start_time', ascending: true,
  })
  const { rows: courses } = useCourses()
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [filterDay, setFilterDay] = useState(todayDow())

  function openNew() { setForm({ ...empty, day_of_week: filterDay }); setEditId(null); setOpen(true) }
  function openEdit(b) {
    setForm({
      title: b.title, course_id: b.course_id, day_of_week: b.day_of_week,
      start_time: hhmm(b.start_time), end_time: hhmm(b.end_time),
      location: b.location || '', kind: b.kind || 'aula',
    })
    setEditId(b.id); setOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    if (editId) await update(editId, form)
    else await add(form)
    setOpen(false)
  }

  const dayBlocks = rows.filter((b) => b.day_of_week === filterDay)

  return (
    <div>
      <PageHeader title="Horario" subtitle="A tua semana, aula a aula" />

      {/* Seletor de dia */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto -mx-1 px-1 pb-1">
        {DAYS.map((d) => {
          const count = rows.filter((b) => b.day_of_week === d.n).length
          const active = d.n === filterDay
          return (
            <button key={d.n} onClick={() => setFilterDay(d.n)}
              className={`flex-shrink-0 px-3.5 py-2 seg ${active ? 'seg-on' : 'seg-off'}`}>
              {d.short}
              {count > 0 && <span className={`ml-1.5 text-xs ${active ? 'text-nova-100' : 'text-slate-500'}`}>{count}</span>}
            </button>
          )
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : dayBlocks.length === 0 ? (
        <EmptyState icon="calendar" title="Sem aulas neste dia" hint="Toca no + para adicionar um bloco." />
      ) : (
        <div className="space-y-2.5">
          {dayBlocks.map((b) => {
            const c = courseById[b.course_id]
            return (
              <div key={b.id} className="card p-3.5 flex items-center gap-3">
                <div className="text-center min-w-[52px]">
                  <p className="text-sm font-bold text-nova-300">{hhmm(b.start_time)}</p>
                  <p className="text-[11px] text-slate-500">{hhmm(b.end_time)}</p>
                </div>
                <div className="w-1 self-stretch rounded-full" style={{ background: c?.color || '#3d78bf', boxShadow: `0 0 10px ${c?.color || '#3d78bf'}55` }} />
                <div className="flex-1 min-w-0" onClick={() => openEdit(b)}>
                  <p className="font-semibold text-slate-100 truncate">{b.title}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="capitalize">{b.kind}</span>
                    {b.location && <><Icon name="pin" className="w-3 h-3" />{b.location}</>}
                  </p>
                </div>
                <button onClick={() => remove(b.id)} className="p-2 text-slate-500 hover:text-rose-400">
                  <Icon name="trash" className="w-4.5 h-4.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <Fab onClick={openNew} />

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? 'Editar bloco' : 'Novo bloco'}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">Nome</label>
            <input className="input" required placeholder="Ex: Microeconomia — Teorica"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Cadeira</label>
            <CourseSelect value={form.course_id} onChange={(v) => setForm({ ...form, course_id: v })} />
          </div>
          <div>
            <label className="label">Dia</label>
            <div className="grid grid-cols-7 gap-1">
              {DAYS.map((d) => (
                <button type="button" key={d.n} onClick={() => setForm({ ...form, day_of_week: d.n })}
                  className={`py-2 seg ${form.day_of_week === d.n ? 'seg-on' : 'seg-off'}`}>{d.short}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Inicio</label>
              <input type="time" className="input" required value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label">Fim</label>
              <input type="time" className="input" required value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sala</label>
              <input className="input" placeholder="Ex: C.017" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {SCHEDULE_KINDS.map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary w-full mt-2">{editId ? 'Guardar' : 'Adicionar'}</button>
        </form>
      </Modal>
    </div>
  )
}
