import { NavLink } from 'react-router-dom'
import { Icon } from './ui.jsx'
import { NAV_TABS } from './navTabs.js'

// Barra lateral — só no computador (hidden até md)
export default function SideNav() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 sticky top-0 h-screen border-r border-white/10 bg-white/[0.02] backdrop-blur-xl px-3 py-5">
      {/* Marca */}
      <div className="flex items-center gap-2.5 px-3 mb-6">
        <svg viewBox="0 0 512 512" className="w-9 h-9 rounded-xl" aria-hidden="true">
          <rect width="512" height="512" rx="112" fill="#0a2540" />
          <path d="M 176 210 A 84 100 0 1 0 336 210" fill="none" stroke="#fff" strokeWidth="44" strokeLinecap="round" />
          <circle cx="256" cy="150" r="40" fill="#fff" />
          <rect x="168" y="392" width="176" height="22" rx="11" fill="#fff" />
        </svg>
        <div className="leading-tight">
          <p className="font-bold text-white text-sm">Nova SBE</p>
          <p className="text-[11px] text-slate-400">Organizer</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-nova-600/25 text-nova-100 border border-nova-500/20'
                  : 'text-slate-400 border border-transparent hover:bg-white/5 hover:text-slate-200'
              }`
            }
          >
            <Icon name={t.icon} className="w-5 h-5" />
            {t.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
