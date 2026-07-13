import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { useCollection } from '../lib/useCollection.js'
import { Icon, Spinner } from '../components/ui.jsx'
import {
  DAYS, todayDow, hhmm, dueLabel, formatDate, courseAverage,
} from '../lib/helpers.js'

const toneClasses = {
  rose: 'bg-rose-100 text-rose-700',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  slate: 'bg-slate-100 text-slate-600',
}

export default function Home() {
  const { user, signOut } = useAuth()
  const { rows: courses } = useCourses()
  const schedule = useCollection('schedule_blocks', { orderBy: 'start_time', ascending: true })
  const assignments = useCollection('assignments', { orderBy: 'due_date', ascending: true })
  const grades = useCollection('grades', { orderBy: 'created_at', ascending: true })

  const dow = todayDow()
  const dayName = DAYS.find((d) => d.n === dow)?.long
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const todayClasses = schedule.rows.filter((b) => b.day_of_week === dow)
  const upcoming = assignments.rows
    .filter((a) => a.status !== 'done')
    .filter((a) => a.due_date)
    .slice(0, 4)

  // Media global ponderada por ECTS (so cadeiras com media calculada)
  const perCourse = courses.map((c) => {
    const comps = grades.rows.filter((g) => g.course_id === c.id)
    return { course: c, avg: courseAverage(comps) }
  }).filter((x) => x.avg !== null)
  const totalEcts = perCourse.reduce((s, x) => s + Number(x.course.ects || 0), 0)
  const globalAvg = totalEcts > 0
    ? perCourse.reduce((s, x) => s + x.avg * Number(x.course.ects || 0), 0) / totalEcts
    : null

  const firstName = (user?.email || '').split('@')[0].split('.')[0]
  const hi = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : 'Ola'

  const loading = schedule.loading || assignments.loading

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-sm text-slate-500 capitalize">{dayName}</p>
          <h1 className="text-2xl font-bold text-nova-800">Ola, {hi} 👋</h1>
        </div>
        <button onClick={signOut} className="p-2 rounded-xl bg-white text-slate-500 shadow-sm border border-slate-100" aria-label="Sair">
          <Icon name="logout" className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-5">
          {/* Resumo rapido */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Cadeiras" value={courses.length} to="/notas" />
            <StatCard label="Prazos" value={assignments.rows.filter((a) => a.status !== 'done').length} to="/prazos" />
            <StatCard label="Media" value={globalAvg !== null ? globalAvg.toFixed(1) : '—'} to="/notas" />
          </div>

          {/* Aulas de hoje */}
          <section>
            <SectionTitle icon="calendar" title="Aulas de hoje" to="/horario" />
            {todayClasses.length === 0 ? (
              <p className="text-sm text-slate-400 px-1 py-3">Sem aulas hoje. Aproveita! 🎉</p>
            ) : (
              <div className="space-y-2">
                {todayClasses.map((b) => {
                  const c = courseById[b.course_id]
                  return (
                    <div key={b.id} className="card p-3 flex items-center gap-3">
                      <div className="w-1.5 h-10 rounded-full" style={{ background: c?.color || '#1f5aa3' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{b.title}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Icon name="clock" className="w-3.5 h-3.5" />
                          {hhmm(b.start_time)}–{hhmm(b.end_time)}
                          {b.location && <> · {b.location}</>}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Proximos prazos */}
          <section>
            <SectionTitle icon="clipboard" title="Proximos prazos" to="/prazos" />
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400 px-1 py-3">Nada a caminho. Tudo em dia ✅</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((a) => {
                  const c = courseById[a.course_id]
                  const dl = dueLabel(a.due_date)
                  return (
                    <div key={a.id} className="card p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500">
                          {c ? c.name : 'Geral'} · {formatDate(a.due_date)}
                        </p>
                      </div>
                      <span className={`chip ${toneClasses[dl.tone]}`}>{dl.text}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, to }) {
  return (
    <Link to={to} className="card p-3 text-center active:scale-95 transition">
      <p className="text-2xl font-bold text-nova-700">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </Link>
  )
}

function SectionTitle({ icon, title, to }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-nova-500" />
        <h2 className="font-bold text-slate-700">{title}</h2>
      </div>
      <Link to={to} className="text-xs font-semibold text-nova-500">Ver tudo</Link>
    </div>
  )
}
