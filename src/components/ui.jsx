import { useEffect } from 'react'

/* ---------- Icones (SVG inline, sem dependencias) ---------- */
export function Icon({ name, className = 'w-6 h-6' }) {
  const paths = {
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
    clipboard: <><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" /></>,
    chart: <><path d="M3 3v18h18" /><rect x="7" y="12" width="3" height="6" /><rect x="12" y="8" width="3" height="10" /><rect x="17" y="4" width="3" height="14" /></>,
    note: <><path d="M4 4h16v12l-4 4H4z" /><path d="M20 16h-4v4" /></>,
    home: <><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>,
    close: <path d="M18 6 6 18M6 6l12 12" />,
    check: <path d="M20 6 9 17l-5-5" />,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    pin: <><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
    spark: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M19 15l.7 1.8L21.5 17l-1.8.7L19 19.5l-.7-1.8L16.5 17l1.8-.7z" /></>,
    send: <><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></>,
    cap: <><path d="M22 10 12 5 2 10l10 5 10-5z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" /></>,
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}

/* ---------- Cabecalho de pagina ---------- */
export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

/* ---------- Botao flutuante (adicionar) ---------- */
export function Fab({ onClick, label = 'Adicionar' }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="fixed right-5 bottom-24 z-30 w-14 h-14 rounded-full text-white shadow-fab flex items-center justify-center active:scale-95 transition"
      style={{ backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 60%, #154680 100%)' }}>
      <Icon name="plus" className="w-7 h-7" />
    </button>
  )
}

/* ---------- Estado vazio ---------- */
export function EmptyState({ icon = 'note', title, hint }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 text-nova-300 flex items-center justify-center mb-3">
        <Icon name={icon} className="w-8 h-8" />
      </div>
      <p className="font-semibold text-slate-200">{title}</p>
      {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}

/* ---------- Spinner ---------- */
export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 rounded-full border-4 border-nova-100 border-t-nova-500 animate-spin" />
    </div>
  )
}

/* ---------- Modal (folha inferior no telemovel) ---------- */
export function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-[#0d1626] border-t border-x border-white/10 sm:border rounded-t-3xl sm:rounded-3xl p-5 pb-8 safe-bottom max-h-[90vh] overflow-y-auto animate-[slideup_.2s_ease] shadow-card">
        <div className="mx-auto -mt-1 mb-3 h-1.5 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-slate-400">
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
