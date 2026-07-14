import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { useCollection } from '../lib/useCollection.js'
import { Icon, Spinner } from '../components/ui.jsx'
import {
  DAYS, todayDow, hhmm, dueLabel, formatDate, resolveGrade,
} from '../lib/helpers.js'
import { upcomingExams } from '../data/exams.js'

const toneClasses = {
  rose: 'bg-rose-500/15 text-rose-300 border border-rose-500/20',
  amber: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
  emerald: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  slate: 'bg-white/10 text-slate-300 border border-white/10',
}

export default function Home() {
  const { displayName, signOut } = useAuth()
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

  const perCourse = courses.map((c) => {
    const comps = grades.rows.filter((g) => g.course_id === c.id)
    return { course: c, avg: resolveGrade(c, comps) }
  }).filter((x) => x.avg !== null)
  const totalEcts = perCourse.reduce((s, x) => s + Number(x.course.ects || 0), 0)
  const globalAvg = totalEcts > 0
    ? perCourse.reduce((s, x) => s + x.avg * Number(x.course.ects || 0), 0) / totalEcts
    : null

  const hi = displayName || 'Olá'
  const openCount = assignments.rows.filter((a) => a.status !== 'done').length
  const upExams = upcomingExams(courses).slice(0, 3)
  const loading = schedule.loading || assignments.loading

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-medium tracking-wide text-nova-300/80 uppercase">{dayName}</p>
          <h1 className="text-3xl font-bold tracking-tight text-white mt-0.5">Olá, {hi} 👋</h1>
        </div>
        <button onClick={signOut} className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-slate-400 hover:text-white transition" aria-label="Sair">
          <Icon name="logout" className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          {/* Cartao media — destaque */}
          <Link to="/notas" className="block relative overflow-hidden rounded-3xl p-5 shadow-glow active:scale-[0.99] transition"
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
                {perCourse.length} de {courses.length} cadeiras com notas · {totalEcts} ECTS
              </p>
            </div>
          </Link>

          {/* Stats rapidas */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Cadeiras" value={courses.length} icon="chart" to="/notas" accent="#3d78bf" />
            <StatCard label="Prazos abertos" value={openCount} icon="clipboard" to="/prazos" accent="#f4a63a" />
          </div>

          {/* Aulas de hoje */}
          <section>
            <SectionTitle icon="calendar" title="Aulas de hoje" to="/horario" />
            {todayClasses.length === 0 ? (
              <div className="card p-4 text-sm text-slate-400">Sem aulas hoje. Aproveita! 🎉</div>
            ) : (
              <div className="space-y-2.5">
                {todayClasses.map((b) => {
                  const c = courseById[b.course_id]
                  return (
                    <div key={b.id} className="card p-3.5 flex items-center gap-3.5">
                      <div className="w-1.5 h-11 rounded-full" style={{ background: c?.color || '#3d78bf', boxShadow: `0 0 12px ${c?.color || '#3d78bf'}66` }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{b.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
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
            <SectionTitle icon="clipboard" title="Próximos prazos" to="/prazos" />
            {upcoming.length === 0 ? (
              <div className="card p-4 text-sm text-slate-400">Nada a caminho. Tudo em dia ✅</div>
            ) : (
              <div className="space-y-2.5">
                {upcoming.map((a) => {
                  const c = courseById[a.course_id]
                  const dl = dueLabel(a.due_date)
                  return (
                    <div key={a.id} className="card p-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
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

          {/* Proximos exames */}
          {upExams.length > 0 && (
            <section>
              <SectionTitle icon="clipboard" title="Próximos exames" to="/prazos" />
              <div className="space-y-2.5">
                {upExams.map((e, i) => {
                  const dl = dueLabel(e.when)
                  return (
                    <div key={i} className="card p-3.5 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{e.course}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{e.typeLabel} · {formatDate(e.when)}</p>
                      </div>
                      <span className={`chip ${toneClasses[dl.tone]}`}>{dl.text}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, to, accent }) {
  return (
    <Link to={to} className="card p-4 active:scale-95 transition">
      <div className="flex items-center justify-between">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}22`, color: accent }}>
          <Icon name={icon} className="w-5 h-5" />
        </span>
        <span className="text-3xl font-bold text-white">{value}</span>
      </div>
      <p className="text-xs text-slate-400 mt-2">{label}</p>
    </Link>
  )
}

function SectionTitle({ icon, title, to }) {
  return (
    <div className="flex items-center justify-between mb-3 px-0.5">
      <div className="flex items-center gap-2">
        <Icon name={icon} className="w-4 h-4 text-nova-300" />
        <h2 className="font-bold text-slate-200">{title}</h2>
      </div>
      <Link to={to} className="text-xs font-semibold text-nova-300 hover:text-nova-200">Ver tudo</Link>
    </div>
  )
}
