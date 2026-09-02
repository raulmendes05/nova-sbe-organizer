import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Modal, Icon } from './ui.jsx'
import { SCHEDULES, datesFor } from '../data/schedules.js'
import { turnosFor, clashesFor } from '../lib/enroll.js'
import { flatCatalog } from '../data/curriculum.js'
import { days as weekDays } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(DIACRITICS, '')

const emMinutos = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
// Ordem de leitura: primeiro pelo dia, depois pela hora a que comeca.
const porQuando = (a, b) => a.d - b.d || emMinutos(a.s) - emMinutos(b.s)
const cedo = (turno) => [...turno.when].sort(porQuando)[0] || { d: 9, s: '99:99' }

const dm = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`

/**
 * Ver os horarios de UMA cadeira sem ter de se inscrever nela.
 *
 * Serve a pergunta que o EnrollFlow nao responde: "a que horas e que a
 * Microeconomia tem teoricas?". La escolhem-se turnos as cegas, aqui poe-se a
 * grelha toda a vista — todos os turnos, todas as aulas da semana, com a sala —
 * para o aluno decidir ANTES: quarta as 17:00 e nao as 18:30.
 *
 * `atuais` sao os turnos ja gravados ({ codigo: [turno] }): com eles marca-se o
 * turno que ele frequenta e avisa-se dos que lhe ficariam por cima de outra aula.
 */
export default function ShiftFinder({ onClose, onEnroll, atuais = {} }) {
  const { program } = useAuth()
  const { t } = useT()
  const [q, setQ] = useState('')
  const [code, setCode] = useState(null)
  const [dia, setDia] = useState(null)          // filtro por dia da semana; null = todos

  // O catalogo so entra para dizer os ECTS — quem manda na lista e a grelha
  // publicada, que e a unica que tem horas para mostrar.
  const ects = useMemo(() => Object.fromEntries(
    flatCatalog(program).map((c) => [String(c.code), c.ects])), [program])

  const cadeiras = useMemo(() => Object.entries(SCHEDULES)
    .filter(([, c]) => c.sessions?.length)
    .map(([code, c]) => ({ code, name: c.name, note: c.note }))
    .sort((a, b) => a.name.localeCompare(b.name)), [])

  const hits = useMemo(() => {
    const query = norm(q.trim())
    if (!query) return cadeiras
    return cadeiras.filter((c) => norm(c.name).includes(query) || c.code.includes(query))
  }, [cadeiras, q])

  function pesquisar(e) {
    e.preventDefault()
    // Escreveu o nome todo (ou quase): nao vale a pena obriga-lo a tocar na
    // linha. "Microeconomics" abre a Microeconomics, e nao fica preso as tres
    // cadeiras que tem a palavra no nome.
    const exata = hits.find((c) => norm(c.name) === norm(q.trim()))
    const alvo = exata || (hits.length === 1 ? hits[0] : null)
    if (alvo) { setCode(alvo.code); setDia(null) }
  }

  const escolhida = code ? SCHEDULES[code] : null
  const grupos = useMemo(() => {
    if (!code) return []
    return turnosFor(code).map((g) => ({
      ...g,
      turnos: [...g.turnos]
        .filter((x) => dia == null || x.when.some((w) => w.d === dia))
        .sort((a, b) => porQuando(cedo(a), cedo(b))),
    }))
  }, [code, dia])
  const vazio = grupos.length > 0 && grupos.every((g) => !g.turnos.length)

  return (
    <Modal open onClose={onClose} title={t('finder.title')}>
      {/* ---------- Procurar a cadeira ---------- */}
      {!escolhida && (
        <>
          <form onSubmit={pesquisar} className="flex gap-2 mb-3">
            {/* min-w-0: sem isto o tamanho natural do <input> empurra o botao
                para fora do modal num telemovel estreito. */}
            <input className="input flex-1 min-w-0" autoFocus placeholder={t('finder.search')}
              value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary px-3 flex items-center gap-1.5 text-sm shrink-0">
              <Icon name="search" className="w-4 h-4" /> {t('finder.searchBtn')}
            </button>
          </form>

          {hits.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">{t('finder.none')}</p>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto -mx-1 px-1">
              {hits.map((c) => (
                <button key={c.code} type="button" onClick={() => { setCode(c.code); setDia(null) }}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left border bg-white/[0.04] border-white/10 active:scale-[0.99] transition">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-100 truncate">{c.name}</span>
                    <span className="block text-xs text-slate-500">
                      #{c.code}{ects[c.code] ? ` · ${ects[c.code]} ECTS` : ''}
                    </span>
                  </span>
                  {(atuais[c.code] || []).length > 0 && (
                    <Icon name="check" className="w-4 h-4 text-accent-400 shrink-0" />
                  )}
                  <Icon name="chevron" className="w-4 h-4 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-3">{t('finder.hint')}</p>
        </>
      )}

      {/* ---------- Os turnos dessa cadeira ---------- */}
      {escolhida && (
        <>
          <button type="button" onClick={() => { setCode(null); setDia(null) }}
            className="flex items-center gap-1.5 text-xs text-nova-300 mb-2">
            <Icon name="chevron" className="w-3.5 h-3.5 rotate-180" /> {t('finder.back')}
          </button>
          <p className="text-sm font-semibold text-slate-100">{escolhida.name}</p>
          <p className="text-xs text-slate-500 mb-3">
            #{code}{ects[code] ? ` · ${ects[code]} ECTS` : ''}
            {escolhida.dates ? ` · ${t('finder.biweekly')}` : ''}
          </p>

          {/* Filtrar por dia: e a pergunta com que se chega aqui — "o que e que
              esta cadeira tem a quarta-feira?" */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button type="button" onClick={() => setDia(null)}
              className={`chip border ${dia == null
                ? 'bg-nova-500/25 border-nova-400/40 text-white'
                : 'bg-white/[0.05] border-white/10 text-slate-300'}`}>
              {t('finder.allDays')}
            </button>
            {weekDays(t).slice(0, 5).map((d) => (
              <button key={d.n} type="button" onClick={() => setDia(dia === d.n ? null : d.n)}
                className={`chip border ${dia === d.n
                  ? 'bg-nova-500/25 border-nova-400/40 text-white'
                  : 'bg-white/[0.05] border-white/10 text-slate-300'}`}>
                {d.short}
              </button>
            ))}
          </div>

          {vazio ? (
            <p className="text-sm text-slate-400 py-6 text-center">{t('finder.noneOnDay')}</p>
          ) : (
            <div className="space-y-4 max-h-[45vh] overflow-y-auto -mx-1 px-1">
              {grupos.filter((g) => g.turnos.length).map((grupo) => (
                <div key={grupo.kind}>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">
                    {t(`coursesPrompt.kind${grupo.kind}`)} · {t('finder.turnos', { n: grupo.turnos.length })}
                  </p>
                  <div className="space-y-1.5">
                    {grupo.turnos.map((x) => {
                      const meu = (atuais[code] || []).includes(x.g)
                      const choque = clashesFor(code, x.g, atuais, grupo.kind)
                      const datas = datesFor(code, x.g)
                      return (
                        <div key={x.g}
                          className={`rounded-xl px-3 py-2.5 border ${meu
                            ? 'bg-accent-500/10 border-accent-400/40'
                            : choque.length ? 'bg-rose-500/[0.07] border-rose-400/25'
                              : 'bg-white/[0.04] border-white/10'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-slate-100">{x.g}</span>
                            {x.term !== 'S1' && (
                              <span className="text-[10px] font-semibold text-slate-400 bg-white/[0.07] rounded px-1.5 py-0.5">
                                {x.term}
                              </span>
                            )}
                            {meu && (
                              <span className="text-[11px] text-accent-300 flex items-center gap-1">
                                <Icon name="check" className="w-3 h-3" /> {t('finder.mine')}
                              </span>
                            )}
                          </div>
                          <ul className="space-y-0.5">
                            {[...x.when].sort(porQuando).map((w, i) => (
                              <li key={i} className="text-xs text-slate-300 tabular-nums">
                                <span className="text-slate-400">{t(`day.${w.d}.short`)}</span>{' '}
                                {w.s}–{w.e}
                                {w.r && <span className="text-slate-500"> · {w.r}</span>}
                              </li>
                            ))}
                          </ul>
                          {datas && (
                            <p className="text-[11px] text-amber-200/80 mt-1">
                              {t('finder.dates', {
                                lista: datas.map((d) => dm(typeof d === 'string' ? d : d.date)).join(', '),
                              })}
                            </p>
                          )}
                          {choque.length > 0 && !meu && (
                            <p className="text-[11px] text-rose-200/90 mt-1">
                              {t('finder.clash', {
                                nome: choque.map((c) => `${c.name} ${c.g}`).join(', '),
                              })}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {onEnroll && (
            <button type="button" onClick={onEnroll} className="btn-ghost w-full py-2.5 text-sm mt-4">
              {t('finder.goEnroll')}
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
