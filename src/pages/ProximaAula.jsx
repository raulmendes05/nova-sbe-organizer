import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { Icon, Spinner } from '../components/ui.jsx'
import { dayLong, upcomingClasses, whenLabel, classTimeRange } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'



export default function ProximaAula() {
  const { t, lang } = useT()
  const schedule = useCollection('schedule_blocks', { orderBy: 'start_time', ascending: true })
  const { rows: courses } = useCourses()
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  // Recalcula ao minuto para a contagem e o "a decorrer" ficarem certos.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  const list = upcomingClasses(schedule.rows, now, 3)
  const next = list[0]
  const after = list.slice(1, 3)

  // Badge no ícone da app: minutos até à próxima aula (só enquanto a app está
  // aberta; nenhum PWA atualiza isto em segundo plano de forma fiável).
  useEffect(() => {
    if (!('setAppBadge' in navigator)) return
    const clear = () => navigator.clearAppBadge?.().catch(() => {})
    if (next && next.offset === 0 && !next.inProgress && next.minsUntil <= 180) {
      navigator.setAppBadge(Math.max(1, next.minsUntil)).catch(() => {})
    } else {
      clear()
    }
    return clear
  }, [next?.block?.id, next?.minsUntil, next?.inProgress])

  const c = next ? courseById[next.block.course_id] : null
  const color = c?.color || '#3d78bf'
  const label = whenLabel(next, next ? dayLong(t, next.day) : '', t, lang)

  const chipTone = !next ? '' : next.inProgress
    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
    : next.offset === 0 && next.minsUntil <= 30
      ? 'bg-amber-500/20 text-amber-200 border-amber-500/30'
      : 'bg-white/10 text-slate-200 border-white/15'

  return (
    <div className="min-h-[calc(100dvh-120px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Icon name="clock" className="w-5 h-5 text-nova-300" />
          <h1 className="text-lg font-bold text-white">{t('home.nextClass')}</h1>
        </div>
        <Link to="/horario" className="text-xs font-semibold text-nova-300 hover:text-nova-200">{t('next.seeSchedule')}</Link>
      </div>

      {schedule.loading ? (
        <Spinner />
      ) : !next ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-3 text-3xl">🎉</div>
          <p className="font-semibold text-slate-200">{t('next.emptyTitle')}</p>
          <p className="text-sm text-slate-500 mt-1">{t('next.emptyHint')}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Cartão principal */}
          <div className="relative overflow-hidden rounded-3xl p-6 shadow-glow"
            style={{ backgroundImage: `linear-gradient(150deg, ${color}, #0f3663 60%, #0a2540)` }}>
            <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <span className={`inline-flex items-center gap-1.5 chip border ${chipTone}`}>
                {next.inProgress && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />}
                {label}
              </span>

              <p className="text-white/70 text-xs font-medium mt-4 uppercase tracking-wide">{t('home.room')}</p>
              <p className="text-white font-bold tracking-tight leading-none mt-1"
                style={{ fontSize: 'clamp(3rem, 22vw, 6rem)' }}>
                {next.block.location || '—'}
              </p>

              <p className="text-lg font-semibold text-white mt-4 leading-snug">{next.block.title}</p>
              <p className="text-nova-100/80 text-sm mt-1 flex items-center gap-1.5">
                <Icon name="clock" className="w-4 h-4" />
                {dayLong(t, next.day)} · {classTimeRange(next)}
              </p>
              {!next.block.location && (
                <p className="text-white/50 text-xs mt-3">
                  {t('next.noRoom')}
                </p>
              )}
            </div>
          </div>

          {/* A seguir */}
          {after.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 px-0.5">{t('next.after')}</p>
              <div className="space-y-2">
                {after.map((e) => {
                  const cc = courseById[e.block.course_id]
                  return (
                    <div key={e.block.id} className="card p-3.5 flex items-center gap-3">
                      <div className="w-1.5 h-10 rounded-full" style={{ background: cc?.color || '#3d78bf' }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-100 truncate">{e.block.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {whenLabel(e, dayLong(t, e.day), t, lang)} · {classTimeRange(e)}
                        </p>
                      </div>
                      {e.block.location && (
                        <span className="chip bg-white/10 text-slate-200 border border-white/10 font-semibold">
                          {e.block.location}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
