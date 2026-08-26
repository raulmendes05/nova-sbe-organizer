import { dayStatus } from '../data/calendar.js'
import { dayLong } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

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
  const { t, lang } = useT()
  const s = dayStatus(todayISO())
  const style = STYLE[s.type]
  if (!style) return null // dias normais de aulas / fim de semana → sem aviso
  const noClass = s.type === 'holiday' || s.type === 'break'
  // Nos dias de compensação a frase é montada aqui (precisa do dia da semana
  // traduzido); nos restantes casos o nome vem do calendário oficial.
  const label = s.type === 'makeup'
    ? t('calendar.makeup', { day: dayLong(t, s.sourceWeekday).toLowerCase() })
    : (lang === 'en' && s.labelEn) || s.label
  const of = lang === 'en' ? s.ofEn : s.of
  return (
    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${style.cls} ${className}`}>
      <span className="text-base leading-none">{style.emoji}</span>
      <span>
        <b>{label}</b>
        {of ? ` · ${t('calendar.makesUpFor', { what: of })}` : ''}
        {noClass ? ` — ${t('calendar.noClasses')}` : ''}
      </span>
    </div>
  )
}
