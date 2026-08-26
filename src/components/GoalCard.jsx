import { useState } from 'react'
import { Icon } from './ui.jsx'
import { goalStatus } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

const TONE = {
  emerald: { bar: 'bg-emerald-400', text: 'text-emerald-300', glow: '#34d399' },
  amber: { bar: 'bg-amber-400', text: 'text-amber-300', glow: '#fbbf24' },
  sky: { bar: 'bg-sky-400', text: 'text-sky-300', glow: '#38bdf8' },
  slate: { bar: 'bg-slate-500', text: 'text-slate-400', glow: '#64748b' },
}

/**
 * Objetivo de média do semestre + progresso.
 * current/goal em 0–20. onSave(valor|null) guarda o objetivo.
 * Sem objetivo definido, mostra um convite para o definir.
 */
export default function GoalCard({ current, goal, onSave, subtitle, compact = false }) {
  const { t } = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(goal != null ? String(goal) : '')
  const [saving, setSaving] = useState(false)

  async function save() {
    const v = draft.trim() === '' ? null : Math.max(0, Math.min(20, Number(draft)))
    if (draft.trim() !== '' && isNaN(Number(draft))) return
    setSaving(true)
    try { await onSave(v); setEditing(false) } finally { setSaving(false) }
  }

  function startEdit() { setDraft(goal != null ? String(goal) : ''); setEditing(true) }

  // ---- modo edição ----
  if (editing) {
    return (
      <div className="card p-4">
        <p className="text-sm font-semibold text-slate-200 mb-1">🎯 {t('goalCard.editTitle')}</p>
        <p className="text-xs text-slate-500 mb-3">{t('goalCard.editHint')}</p>
        <div className="flex items-center gap-2">
          <input autoFocus type="number" step="0.5" min="0" max="20" inputMode="decimal"
            className="input w-24 text-lg font-semibold" placeholder={t('profile.goalPlaceholder')}
            value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()} />
          <span className="text-slate-500">/ 20</span>
          <div className="flex-1" />
          {goal != null && (
            <button onClick={async () => { setDraft(''); setSaving(true); try { await onSave(null); setEditing(false) } finally { setSaving(false) } }}
              disabled={saving} className="btn-ghost px-3 py-2 text-sm text-rose-400">{t('common.remove')}</button>
          )}
          <button onClick={() => setEditing(false)} disabled={saving} className="btn-ghost px-3 py-2 text-sm">{t('common.cancel')}</button>
          <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">{t('common.save')}</button>
        </div>
      </div>
    )
  }

  // ---- sem objetivo: convite ----
  if (goal == null) {
    return (
      <button onClick={startEdit}
        className="card w-full p-4 flex items-center gap-3 text-left hover:bg-white/[0.06] transition">
        <span className="w-10 h-10 rounded-xl bg-nova-500/15 text-nova-300 flex items-center justify-center shrink-0 text-lg">🎯</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-slate-100">{t('goalCard.inviteTitle')}</span>
          <span className="block text-xs text-slate-400">{t('goalCard.inviteHint')}</span>
        </span>
        <Icon name="plus" className="w-5 h-5 text-nova-300 shrink-0" />
      </button>
    )
  }

  // ---- com objetivo: progresso ----
  const st = goalStatus(current, goal, t)
  const tone = TONE[st.tone]
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-sm font-semibold text-slate-200">🎯 {t('goalCard.title')}</span>
        {subtitle && <span className="text-xs text-slate-500">· {subtitle}</span>}
        <div className="flex-1" />
        <button onClick={startEdit} className="p-1 text-slate-500 hover:text-slate-200" aria-label={t('goalCard.edit')}>
          <Icon name="edit" className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-end gap-1.5 mb-2.5">
        <span className={`text-3xl font-bold tracking-tight ${current === null ? 'text-slate-500' : tone.text}`}>
          {current === null ? '—' : current.toFixed(1)}
        </span>
        <span className="text-slate-500 mb-1 font-medium">/ {goal.toFixed(1)}</span>
      </div>

      {/* barra de progresso; marca da meta no 100% */}
      <div className="relative h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
          style={{ width: `${Math.round(st.pct * 100)}%`, boxShadow: `0 0 10px ${tone.glow}88` }} />
      </div>

      <p className={`text-xs font-medium mt-2 ${tone.text}`}>
        {st.reached && '✅ '}{st.label}
      </p>
    </div>
  )
}
