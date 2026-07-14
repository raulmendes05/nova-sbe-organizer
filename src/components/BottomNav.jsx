import { NavLink } from 'react-router-dom'
import { Icon } from './ui.jsx'
import { NAV_TABS } from './navTabs.js'

// Barra inferior — só no telemóvel (md:hidden)
export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0a1220]/80 backdrop-blur-xl border-t border-white/10 safe-bottom">
      <div className="max-w-md mx-auto grid grid-cols-6">
        {NAV_TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                isActive ? 'text-nova-300' : 'text-slate-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-nova-400 shadow-glow" />}
                <Icon name={t.icon} className="w-6 h-6" />
                <span className="leading-tight text-center px-0.5">{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
