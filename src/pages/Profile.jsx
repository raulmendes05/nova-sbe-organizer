import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useT, LANGS } from '../i18n/index.jsx'
import { PageHeader, Icon } from '../components/ui.jsx'
import { PROGRAMS } from '../data/curriculum.js'
import { termKey } from '../lib/helpers.js'

/* ---------- Seccao com titulo e ajuda ---------- */
function Section({ title, hint, children }) {
  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
      {hint && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{hint}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  )
}

/* ---------- Botoes segmentados (ano, semestre, curso, idioma) ---------- */
// Classes literais: o Tailwind varre o codigo-fonte e nao ve nomes montados
// em runtime (`grid-cols-${n}` seria purgado do CSS final).
const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }

function Segmented({ options, value, onChange }) {
  return (
    <div className={`grid gap-2 ${COLS[options.length] || 'grid-cols-2'}`}>
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`seg py-2.5 px-2 ${value === o.v ? 'seg-on' : 'seg-off'}`}
          style={value === o.v ? { backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 100%)' } : undefined}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function Profile() {
  const {
    user, displayName, academicYear, semester, program, lang,
    goals, signOut, updateProfile,
  } = useAuth()
  const { t } = useT()

  const [name, setName] = useState(displayName || '')
  const [year, setYear] = useState(academicYear || '')
  const [term, setTerm] = useState(semester || '')
  const [prog, setProg] = useState(program || 'management')

  // O objetivo pertence ao semestre — ao mudar de ano/semestre nos botoes, o
  // campo passa a mostrar o objetivo desse semestre, nao o do anterior.
  const draftKey = termKey(Number(year) || null, Number(term) || null)
  const savedGoal = goals?.[draftKey]
  const [goalKey, setGoalKey] = useState(draftKey)
  const [goal, setGoal] = useState(savedGoal != null ? String(savedGoal) : '')
  if (goalKey !== draftKey) {
    setGoalKey(draftKey)
    setGoal(savedGoal != null ? String(savedGoal) : '')
  }

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)

  const dirty =
    name.trim() !== (displayName || '') ||
    year !== (academicYear || '') ||
    term !== (semester || '') ||
    prog !== (program || 'management') ||
    goal.trim() !== (savedGoal != null ? String(savedGoal) : '')

  const canSave = dirty && !!name.trim() && !!year && !!term && !saving

  async function save() {
    setSaving(true); setErr(null); setSaved(false)
    try {
      const nextGoals = { ...(goals || {}) }
      const raw = goal.trim()
      if (raw === '' || isNaN(Number(raw))) delete nextGoals[draftKey]
      else nextGoals[draftKey] = Math.max(0, Math.min(20, Number(raw)))

      await updateProfile({
        display_name: name.trim(),
        year, semester: term, program: prog,
        goals: nextGoals,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setErr(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // O idioma aplica-se de imediato: e a unica forma de o aluno ver o que
  // escolheu. Nao entra no botao Guardar.
  async function pickLang(v) {
    if (v === lang) return
    try { await updateProfile({ lang: v }) } catch { setErr(t('common.error')) }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(user?.email || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* sem clipboard (http ou browser antigo) — ignora */ }
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'pt-PT',
        { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <div className="space-y-4">
        {/* ---- Conta ---- */}
        <Section title={t('profile.account')} hint={t('profile.emailHint')}>
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-3">
            <span className="w-9 h-9 rounded-xl bg-nova-500/20 text-nova-200 flex items-center justify-center shrink-0">
              <Icon name="user" className="w-5 h-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] uppercase tracking-wide text-slate-500">{t('profile.email')}</span>
              <span className="block text-sm text-slate-100 truncate">{user?.email}</span>
            </span>
            <button type="button" onClick={copyEmail}
              className="shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-slate-300 hover:text-white transition">
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          {createdAt && (
            <p className="text-xs text-slate-500 mt-2.5">
              {t('profile.since', { date: createdAt })}
            </p>
          )}
        </Section>

        {/* ---- Nome ---- */}
        <Section title={t('profile.name')} hint={t('profile.nameHint')}>
          <input type="text" maxLength={40} value={name} onChange={(e) => setName(e.target.value)}
            className="input" placeholder={t('profile.namePlaceholder')} />
        </Section>

        {/* ---- Estudos ---- */}
        <Section title={t('profile.studies')} hint={t('profile.studiesHint')}>
          <div className="space-y-3.5">
            <div>
              <p className="label">{t('profile.year')}</p>
              <Segmented value={year} onChange={setYear} options={[
                { v: '1', label: t('profile.year1') },
                { v: '2', label: t('profile.year2') },
                { v: '3', label: t('profile.year3') },
              ]} />
            </div>
            <div>
              <p className="label">{t('profile.semester')}</p>
              <Segmented value={term} onChange={setTerm} options={[
                { v: '1', label: t('profile.sem1') },
                { v: '2', label: t('profile.sem2') },
              ]} />
            </div>
            <div>
              <p className="label">{t('profile.program')}</p>
              <Segmented value={prog} onChange={setProg} options={
                Object.entries(PROGRAMS).map(([v, p]) => ({ v, label: p.label }))
              } />
            </div>
          </div>
        </Section>

        {/* ---- Objetivo de media ---- */}
        <Section title={`🎯 ${t('profile.goal')}`} hint={t('profile.goalHint')}>
          <div className="flex items-center gap-2">
            <input type="number" step="0.5" min="0" max="20" inputMode="decimal"
              value={goal} onChange={(e) => setGoal(e.target.value)}
              className="input w-28 text-lg font-semibold" placeholder={t('profile.goalPlaceholder')} />
            <span className="text-slate-500">/ 20</span>
          </div>
        </Section>

        {/* ---- Idioma (aplica-se logo) ---- */}
        <Section title={t('profile.language')} hint={t('profile.languageHint')}>
          <Segmented value={lang} onChange={pickLang} options={
            LANGS.map((l) => ({ v: l.v, label: `${l.flag}  ${l.label}` }))
          } />
          <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{t('profile.languagePartial')}</p>
        </Section>

        {/* ---- Guardar ---- */}
        {err && <p className="text-sm text-rose-200 bg-rose-500/15 border border-rose-500/20 rounded-xl px-3.5 py-2.5">{err}</p>}
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={!canSave}
            className="btn-primary flex-1"
            style={{ backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 100%)' }}>
            {saving ? t('common.saving') : t('common.save')}
          </button>
          {saved && (
            <span className="text-sm font-medium text-emerald-300 flex items-center gap-1.5">
              <Icon name="check" className="w-4 h-4" />{t('common.saved')}
            </span>
          )}
        </div>

        {/* ---- Sessao ---- */}
        <Section title={t('profile.session')} hint={t('profile.signOutHint')}>
          <button onClick={signOut}
            className="btn-ghost w-full text-rose-300 hover:text-rose-200">
            <Icon name="logout" className="w-5 h-5" />
            {t('profile.signOut')}
          </button>
        </Section>
      </div>
    </div>
  )
}
