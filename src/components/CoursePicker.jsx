import { useMemo, useState } from 'react'
import { Modal, Icon } from './ui.jsx'
import { PROGRAMS, AREA_LABELS, flatCatalog } from '../data/curriculum.js'

const AREA_TONE = {
  mandatory: 'bg-nova-500/20 text-nova-200',
  area: 'bg-emerald-500/20 text-emerald-200',
  general: 'bg-violet-500/20 text-violet-200',
  additional: 'bg-amber-500/20 text-amber-200',
}

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s) => s.toLowerCase().normalize('NFD').replace(DIACRITICS, '')

/**
 * Seletor do catalogo Nova SBE. Pesquisa e escolhe uma cadeira real;
 * onPick recebe { name, code, ects, area }. Cadeiras ja adicionadas
 * (por codigo) aparecem marcadas.
 */
export default function CoursePicker({ open, onClose, onPick, onManual, existingCodes, defaultProgram = 'management' }) {
  const [program, setProgram] = useState(defaultProgram)
  const [q, setQ] = useState('')

  const catalog = useMemo(() => flatCatalog(program), [program])
  const filtered = useMemo(() => {
    const query = norm(q.trim())
    if (!query) return catalog
    return catalog.filter((c) => norm(c.name).includes(query) || c.code.includes(query))
  }, [catalog, q])

  // Agrupar por area, mantendo a ordem
  const groups = ['mandatory', 'area', 'general', 'additional']
    .map((area) => ({ area, items: filtered.filter((c) => c.area === area) }))
    .filter((g) => g.items.length)

  return (
    <Modal open={open} onClose={onClose} title="Catálogo Nova SBE">
      {/* Curso */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {Object.entries(PROGRAMS).map(([key, p]) => (
          <button key={key} type="button" onClick={() => setProgram(key)}
            className={`py-2 seg ${program === key ? 'seg-on' : 'seg-off'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <input autoFocus className="input mb-1" placeholder="Pesquisar cadeira ou código..."
        value={q} onChange={(e) => setQ(e.target.value)} />
      <p className="text-xs text-slate-500 mb-3 px-0.5">Toca numa cadeira para a adicionar. Podes adicionar várias.</p>

      <div className="space-y-4">
        {groups.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">Sem resultados.</p>
        )}
        {groups.map((g) => (
          <div key={g.area}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{AREA_LABELS[g.area]}</p>
            <div className="space-y-1.5">
              {g.items.map((c) => {
                const added = existingCodes?.has(c.code)
                return (
                  <button key={`${g.area}-${c.code}`} type="button" disabled={added}
                    onClick={() => onPick({ name: c.name, code: c.code, ects: c.ects, area: c.area })}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left border transition ${
                      added
                        ? 'bg-white/[0.02] border-white/5 opacity-50'
                        : 'bg-white/[0.05] border-white/10 hover:bg-white/10 active:scale-[0.99]'
                    }`}>
                    <span className={`chip ${AREA_TONE[c.area]} shrink-0`}>{c.ects}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-100 truncate">{c.name}</span>
                      <span className="block text-xs text-slate-500">#{c.code}</span>
                    </span>
                    {added
                      ? <Icon name="check" className="w-4 h-4 text-emerald-400 shrink-0" />
                      : <Icon name="plus" className="w-4 h-4 text-nova-300 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {onManual && (
        <button type="button" onClick={onManual}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-200 mt-5 py-2">
          Não está na lista? Adicionar manualmente
        </button>
      )}
    </Modal>
  )
}
