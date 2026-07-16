import { dayStatus } from '../data/calendar.js'

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STYLE = {
  holiday: { emoji: '🏖️', cls: 'bg-rose-500/15 text-rose-200 border-rose-500/25' },
  break: { emoji: '🌴', cls: 'bg-rose-500/15 text-rose-200 border-rose-500/25' },
  makeup: { emoji: '🔁', cls: 'bg-amber-500/15 text-amber-200 border-amber-500/25' },
  exams: { emoji: '📚', cls: 'bg-violet-500/15 text-violet-200 border-violet-500/25' },
  none: { emoji: '😎', cls: 'bg-white/10 text-slate-300 border-white/10' },
}

/** Aviso do estado académico de hoje (feriado, pausa, compensação, exames…). */
export default function CalendarBanner({ className = '' }) {
  const s = dayStatus(todayISO())
  const style = STYLE[s.type]
  if (!style) return null // dias normais de aulas / fim de semana → sem aviso
  const noClass = s.type === 'holiday' || s.type === 'break'
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${style.cls} ${className}`}>
      <span className="text-base leading-none">{style.emoji}</span>
      <span>
        <b>{s.label}</b>
        {s.of ? ` · compensa ${s.of}` : ''}
        {noClass ? ' — sem aulas' : ''}
      </span>
    </div>
  )
}
