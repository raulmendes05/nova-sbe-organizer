import { NavLink } from 'react-router-dom'
import { Icon } from './ui.jsx'

const tabs = [
  { to: '/', icon: 'home', label: 'Inicio', end: true },
  { to: '/horario', icon: 'calendar', label: 'Horario' },
  { to: '/prazos', icon: 'clipboard', label: 'Prazos' },
  { to: '/notas', icon: 'chart', label: 'Notas' },
  { to: '/tarefas', icon: 'note', label: 'Notas & Tarefas' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition ${
                isActive ? 'text-nova-700' : 'text-slate-400'
              }`
            }
          >
            <Icon name={t.icon} className="w-6 h-6" />
            <span className="leading-tight text-center px-0.5">{t.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
