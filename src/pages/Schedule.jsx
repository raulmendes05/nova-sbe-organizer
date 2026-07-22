import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { DAYS, SCHEDULE_KINDS, hhmm, todayDow } from '../lib/helpers.js'
import CalendarBanner from '../components/CalendarBanner.jsx'
import WeekGrid from '../components/WeekGrid.jsx'

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

  function openNew() { setForm({ ...empty, day_of_week: todayDow() }); setEditId(null); setOpen(true) }
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

  const hoursPerWeek = rows.reduce((a, b) => {
    const [sh, sm] = hhmm(b.start_time).split(':').map(Number)
    const [eh, em] = hhmm(b.end_time).split(':').map(Number)
    return a + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  return (
    <div className="pb-24">
      <PageHeader
        title="Horário"
        subtitle={rows.length
          ? `${rows.length} aulas · ${hoursPerWeek.toFixed(hoursPerWeek % 1 ? 1 : 0)}h por semana`
          : 'A tua semana, aula a aula'} />

      <CalendarBanner className="mb-4" />

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon="calendar" title="Ainda não tens horário" hint="Toca no + para adicionares a primeira aula." />
      ) : (
        <WeekGrid blocks={rows} courseById={courseById} onPick={openEdit} />
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
          {/* Na grelha não cabe um botão por bloco — apaga-se aqui. */}
          {editId && (
            <button type="button"
              onClick={async () => {
                if (!window.confirm('Apagar esta aula do horário?')) return
                await remove(editId); setOpen(false)
              }}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 flex items-center justify-center gap-2">
              <Icon name="trash" className="w-4 h-4" /> Apagar
            </button>
          )}
        </form>
      </Modal>
    </div>
  )
}
