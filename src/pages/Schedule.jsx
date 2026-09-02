import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon, ErrorBox } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import { days as weekDays, scheduleKinds, hhmm, todayDow } from '../lib/helpers.js'
import { officialBlock } from '../lib/enroll.js'
import { weekOf, withDeadlines } from '../lib/week.js'
import { localeOf } from '../lib/helpers.js'
import EnrollFlow from '../components/EnrollFlow.jsx'
import { useT } from '../i18n/index.jsx'
import CalendarBanner from '../components/CalendarBanner.jsx'
import WeekGrid from '../components/WeekGrid.jsx'
import { buildICS } from '../lib/ics.js'

const empty = {
  title: '', course_id: null, day_of_week: todayDow(),
  start_time: '09:00', end_time: '10:30', location: '', kind: 'aula',
}

export default function Schedule() {
  const { rows, loading, error, clearError, add, update, remove, reload } = useCollection('schedule_blocks', {
    orderBy: 'start_time', ascending: true,
  })
  const { rows: courses } = useCourses()
  const { semester, academicYear, lang } = useAuth()
  const prazos = useCollection('assignments', { orderBy: 'due_date', ascending: true })
  const { t } = useT()
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const [open, setOpen] = useState(false)
  // Quem chega aqui pelo botao dos primeiros passos ja disse que quer
  // inscrever-se — abrir o ecra evita mais um clique as cegas.
  const location = useLocation()
  const [turmasAberto, setTurmasAberto] = useState(Boolean(location.state?.enroll))
  const [semana, setSemana] = useState(0)   // 0 = esta semana
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [exported, setExported] = useState(null)

  function exportCalendar() {
    const porEntregar = prazos.rows.filter((a) => a.due_date && a.status !== 'done')
    const { text, count, deadlineCount } = buildICS(rows, {
      semester: Number(semester) || 1,
      name: t('schedule.icsName'),
      deadlines: porEntregar,
    })
    if (!count && !deadlineCount) { setExported(t('schedule.nothingToExport')); return }
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'horario-nova-sbe.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setExported([t('schedule.exported', { n: count }),
      deadlineCount ? t('schedule.plusDeadlines', { n: deadlineCount }) : ''].join(' ').trim())
    setTimeout(() => setExported(null), 4000)
  }

  function openNew() { setForm({ ...empty, day_of_week: todayDow() }); setEditId(null); setAviso(null); setOpen(true) }
  function openEdit(b) {
    setForm({
      title: b.title, course_id: b.course_id, day_of_week: b.day_of_week,
      start_time: hhmm(b.start_time), end_time: hhmm(b.end_time),
      location: b.location || '', kind: b.kind || 'aula',
    })
    setEditId(b.id); setAviso(null); setOpen(true)
  }

  async function save(e) {
    e.preventDefault()
    // O <input type="time"> aceita qualquer par de horas: sem isto dava para
    // gravar uma aula das 18:00 as 09:00, que nem se via na grelha.
    if (form.end_time <= form.start_time) { setAviso(t('valid.endBeforeStart')); return }
    setAviso(null)
    try {
      if (editId) await update(editId, form)
      else await add(form)
      setOpen(false)
    } catch { /* o useCollection ja pos a mensagem em `error` — o modal fica aberto */ }
  }

  // O que ja esta gravado, para o ecra das turmas abrir com tudo marcado em vez
  // de obrigar a escolher outra vez do zero.
  const { preSelect, preTurnos } = (() => {
    const codigos = []
    const porCodigo = {}
    for (const b of rows) {
      const info = officialBlock(b.title)
      if (!info) continue
      if (!codigos.includes(info.code)) codigos.push(info.code)
      porCodigo[info.code] = [...new Set([...(porCodigo[info.code] || []), info.g])]
    }
    // cadeiras deste semestre que ainda nao tem nenhum bloco no horario
    const ano = Number(academicYear) || null
    const termo = Number(semester) || null
    for (const c of courses) {
      const code = c.code ? String(c.code) : null
      if (code && c.year === ano && c.term === termo && !codigos.includes(code)) codigos.push(code)
    }
    return { preSelect: codigos, preTurnos: porCodigo }
  })()

  // A semana a mostrar: as aulas que la correm mesmo (T1/T2, feriados, pausas
  // e dias de compensacao) mais os prazos que caem nesses dias.
  const dias = useMemo(() => {
    const base = withDeadlines(weekOf(rows, new Date(), semana), prazos.rows, courses)
    return base.map((d) => {
      const st = d.status
      const semAulas = !d.blocks.length && (st.type === 'holiday' || st.type === 'break')
      const aviso = st.type === 'holiday' || st.type === 'break'
        ? (lang === 'en' ? st.labelEn : st.label)
        : st.type === 'makeup' ? t('schedule.makeup') : null
      return { ...d, semAulas, aviso }
    })
  }, [rows, prazos.rows, courses, semana, lang, t])

  const intervalo = (() => {
    const fmt = (d) => d.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })
    return `${fmt(dias[0].date)} – ${fmt(dias[6].date)}`
  })()

  const hoursPerWeek = rows.reduce((a, b) => {
    const [sh, sm] = hhmm(b.start_time).split(':').map(Number)
    const [eh, em] = hhmm(b.end_time).split(':').map(Number)
    return a + (eh * 60 + em - sh * 60 - sm) / 60
  }, 0)

  return (
    <div className="pb-24">
      <PageHeader
        title={t('schedule.title')}
        subtitle={rows.length
          ? t('schedule.subtitle', { n: rows.length, h: hoursPerWeek.toFixed(hoursPerWeek % 1 ? 1 : 0) })
          : t('schedule.subtitleEmpty')}
        right={rows.length > 0 && (
          <button onClick={exportCalendar}
            className="flex items-center gap-1.5 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10 transition">
            <Icon name="calendar" className="w-4 h-4" /> {t('schedule.addToCalendar')}
          </button>
        )} />

      <ErrorBox error={error} onClose={clearError} className="mb-4" />

      {/* Para quem deu skip ao pop-up de inscricao — ou quer trocar de turno */}
      <button onClick={() => setTurmasAberto(true)}
        className="card w-full p-3.5 mb-4 flex items-center gap-3 text-left active:scale-[0.99] transition">
        <span className="w-9 h-9 rounded-xl bg-nova-500/15 text-nova-200 flex items-center justify-center shrink-0">
          <Icon name="cap" className="w-5 h-5" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-200">{t('schedule.myShifts')}</span>
          <span className="block text-xs text-slate-500">{t('schedule.myShiftsHint')}</span>
        </span>
        <Icon name="chevron" className="w-4 h-4 text-slate-500 shrink-0" />
      </button>

      {turmasAberto && (
        <EnrollFlow preSelect={preSelect} preTurnos={preTurnos}
          onSaved={reload} onClose={() => setTurmasAberto(false)} />
      )}

      {exported && (
        <div className="card p-2.5 mb-3 text-sm text-emerald-200 bg-emerald-500/10 border-emerald-500/20 flex items-center gap-2">
          <Icon name="check" className="w-4 h-4 shrink-0" />
          <span>{exported} — {t('schedule.icsHint')}</span>
        </div>
      )}

      <CalendarBanner className="mb-4" />

      {loading ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState icon="calendar" title={t('schedule.emptyTitle')} hint={t('schedule.emptyHint')} />
      ) : (
        <>
          {/* Navegar entre semanas: o horário não é igual todas elas */}
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => setSemana(semana - 1)} aria-label={t('schedule.prevWeek')}
              className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center active:scale-95 transition">
              <Icon name="chevron" className="w-4 h-4 rotate-180" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold text-slate-200 tabular-nums">{intervalo}</p>
              <p className="text-[11px] text-slate-500">
                {semana === 0 ? t('schedule.thisWeek') : t('schedule.weeksAway', { n: Math.abs(semana) })}
              </p>
            </div>
            <button onClick={() => setSemana(semana + 1)} aria-label={t('schedule.nextWeek')}
              className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center active:scale-95 transition">
              <Icon name="chevron" className="w-4 h-4" />
            </button>
          </div>
          {semana !== 0 && (
            <button onClick={() => setSemana(0)}
              className="w-full text-center text-xs text-nova-300 mb-2 py-1">
              {t('schedule.backToThisWeek')}
            </button>
          )}

          <WeekGrid days={dias} courseById={courseById} onPick={openEdit} />
        </>
      )}

      <Fab onClick={openNew} />

      <Modal open={open} onClose={() => setOpen(false)} title={editId ? t('schedule.editBlock') : t('schedule.newBlock')}>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="label">{t('schedule.name')}</label>
            <input className="input" required placeholder={t('schedule.namePlaceholder')}
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">{t('common.course')}</label>
            <CourseSelect value={form.course_id} onChange={(v) => setForm({ ...form, course_id: v })} />
          </div>
          <div>
            <label className="label">{t('schedule.day')}</label>
            <div className="grid grid-cols-7 gap-1">
              {weekDays(t).map((d) => (
                <button type="button" key={d.n} onClick={() => setForm({ ...form, day_of_week: d.n })}
                  className={`py-2 seg ${form.day_of_week === d.n ? 'seg-on' : 'seg-off'}`}>{d.short}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('schedule.start')}</label>
              <input type="time" className="input" required value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('schedule.end')}</label>
              <input type="time" className="input" required value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('home.room')}</label>
              <input className="input" placeholder={t('schedule.roomPlaceholder')} value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('common.kind')}</label>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {scheduleKinds(t).map((k) => <option key={k.v} value={k.v}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <ErrorBox error={aviso || error} onClose={() => { setAviso(null); clearError() }} />
          <button className="btn-primary w-full mt-2">{editId ? t('common.save') : t('common.add')}</button>
          {/* Na grelha não cabe um botão por bloco — apaga-se aqui. */}
          {editId && (
            <button type="button"
              onClick={async () => {
                if (!window.confirm(t('schedule.confirmDelete'))) return
                try { await remove(editId); setOpen(false) } catch { /* mensagem ja visivel */ }
              }}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/10 flex items-center justify-center gap-2">
              <Icon name="trash" className="w-4 h-4" /> {t('common.delete')}
            </button>
          )}
        </form>
      </Modal>
    </div>
  )
}
