import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { Modal } from './ui.jsx'
import { useT } from '../i18n/index.jsx'
import { checkNumber, LIMITS } from '../lib/helpers.js'

const DISMISS_KEY = 'goalPromptDismissed'

/**
 * Pop-up de boas-vindas ao objetivo: aparece quando o aluno ainda não definiu
 * a média-meta do semestre atual. Fica adormecido durante a sessão se ele
 * escolher "Agora não", mas volta a aparecer numa próxima visita.
 */
export default function GoalPrompt() {
  const { goalAvg, updateGoal, currentTermKey } = useAuth()
  const { rows: courses, loading: coursesLoading } = useCourses()
  const { t } = useT()
  const dismissed = typeof sessionStorage !== 'undefined'
    && sessionStorage.getItem(DISMISS_KEY) === String(currentTermKey)
  const [open, setOpen] = useState(true)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState(null)

  // Espera pelo CoursesPrompt: sem cadeiras nao ha media para ter meta, e os
  // dois modais abertos ao mesmo tempo ficavam um por cima do outro.
  if (goalAvg != null || dismissed || coursesLoading || !courses.length) return null

  function dismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, String(currentTermKey)) } catch { /* ignore */ }
    setOpen(false)
  }

  async function save() {
    const mal = checkNumber(draft, LIMITS.grade, t, { required: true })
    if (mal) { setAviso(mal); return }
    setAviso(null)
    setSaving(true)
    try {
      await updateGoal(Number(draft))
      setOpen(false)
    } finally { setSaving(false) }
  }

  return (
    <Modal open={open} onClose={dismiss} title={t('goalPrompt.title')}>
      <p className="text-sm text-slate-300 leading-relaxed mb-1">
        {t('goalPrompt.body')}
      </p>
      <div className="flex items-center gap-2 mt-4">
        <input autoFocus type="number" step="0.5" min="0" max="20" inputMode="decimal"
          className="input w-24 text-xl font-bold" placeholder={t('profile.goalPlaceholder')}
          value={draft} onChange={(e) => { setDraft(e.target.value); if (aviso) setAviso(null) }}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
        <span className="text-slate-500">/ 20</span>
      </div>
      {aviso && <p role="alert" className="text-xs text-rose-300 mt-2">{aviso}</p>}
      <div className="flex gap-2 mt-5">
        <button onClick={dismiss} disabled={saving} className="btn-ghost flex-1 py-2.5 text-sm">{t('goalPrompt.later')}</button>
        <button onClick={save} disabled={saving || draft.trim() === ''} className="btn-primary flex-1 py-2.5">
          {saving ? t('common.saving') : t('goalPrompt.set')}
        </button>
      </div>
    </Modal>
  )
}
