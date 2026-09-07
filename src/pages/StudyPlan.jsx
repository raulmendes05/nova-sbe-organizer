import { useMemo, useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PageHeader, Icon, Spinner, ErrorBox, EmptyState } from '../components/ui.jsx'
import CourseSelect from '../components/CourseSelect.jsx'
import SlideSummary from '../components/SlideSummary.jsx'
import { localeOf } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'
import { upcomingExams } from '../data/exams.js'
import {
  weekKeyOf, weekBounds, planBody, planOfWeek,
  isSummaryRow, summaryOf, summaryBody, suggestions,
} from '../lib/plan.js'

// O resumo guardado vai em JSON para poder voltar a aparecer com as secções
// todas; se um dia vier estragado, mostra-se o texto que lá estiver.
function lerResumo(texto) {
  try {
    const v = JSON.parse(texto)
    return v && typeof v === 'object' ? v : null
  } catch { return null }
}

export default function StudyPlan() {
  const { rows, loading, error, clearError, add, update, remove } = useCollection('notes', {
    orderBy: 'created_at', ascending: true,
  })
  const { rows: courses } = useCourses()
  const prazos = useCollection('assignments', { orderBy: 'due_date', ascending: true })
  const { lang, academicYear, semester } = useAuth()
  const { t } = useT()

  const [offset, setOffset] = useState(0)          // 0 = esta semana
  const [texto, setTexto] = useState('')
  const [cadeira, setCadeira] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aberto, setAberto] = useState(null)        // resumo aberto
  const [verSugestoes, setVerSugestoes] = useState(true)

  const semana = weekKeyOf(new Date(), offset)
  const anterior = weekKeyOf(new Date(), offset - 1)
  const { segunda, domingo } = weekBounds(semana)
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const itens = planOfWeek(rows, semana)
  const feitos = itens.filter((x) => x.done).length
  const porFazer = planOfWeek(rows, anterior).filter((x) => !x.done)
  const resumos = rows.filter(isSummaryRow).slice().reverse()

  // Cadeiras deste semestre — as provas das outras já não interessam
  const desteSemestre = courses.filter((c) =>
    !c.is_equivalence && (!c.year || c.year === Number(academicYear)) && (!c.term || c.term === Number(semester)))
  const propostas = useMemo(() => suggestions({
    semana,
    assignments: prazos.rows,
    exames: upcomingExams(desteSemestre.length ? desteSemestre : courses, segunda),
    courses,
    jaNoPlano: itens.map((x) => x.title),
    t,
  }), [semana, prazos.rows, courses, itens, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const intervalo = (() => {
    const fmt = (d) => d.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })
    return `${fmt(segunda)} – ${fmt(domingo)}`
  })()

  async function juntar(titulo, course_id = null) {
    if (!String(titulo || '').trim()) return
    setGuardando(true)
    try {
      await add({
        title: String(titulo).trim(), body: planBody(semana),
        course_id: course_id || null, is_task: true, done: false,
      })
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  async function adicionarEscrito(e) {
    e.preventDefault()
    const v = texto.trim()
    if (!v) return
    setTexto('')
    await juntar(v, cadeira)
  }

  // Trazer o que ficou por fazer: mudar de semana é só reescrever o marcador.
  async function trazerAtrasados() {
    setGuardando(true)
    try {
      for (const x of porFazer) await update(x.id, { body: planBody(semana) })
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  async function guardarResumo({ nome, resumo, course_id }) {
    setGuardando(true)
    try {
      await add({
        title: nome || t('plan.summary'), body: summaryBody(nome || '', JSON.stringify(resumo)),
        course_id: course_id || null, is_task: false, done: false,
      })
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  return (
    <div className="pb-24">
      <PageHeader title={t('nav.plan')} subtitle={t('plan.subtitle')} />

      <ErrorBox error={error || prazos.error} onClose={() => { clearError(); prazos.clearError() }} className="mb-4" />

      {/* ---------- A semana ---------- */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setOffset(offset - 1)} aria-label={t('schedule.prevWeek')}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center active:scale-95 transition">
          <Icon name="chevron" className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-slate-200 tabular-nums">{intervalo}</p>
          <p className="text-[11px] text-slate-500">
            {offset === 0 ? t('schedule.thisWeek') : t('schedule.weeksAway', { n: Math.abs(offset) })}
          </p>
        </div>
        <button onClick={() => setOffset(offset + 1)} aria-label={t('schedule.nextWeek')}
          className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 flex items-center justify-center active:scale-95 transition">
          <Icon name="chevron" className="w-4 h-4" />
        </button>
      </div>
      {offset !== 0 && (
        <button onClick={() => setOffset(0)} className="w-full text-center text-xs text-nova-300 mb-2 py-1">
          {t('schedule.backToThisWeek')}
        </button>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* ---------- Progresso ---------- */}
          {itens.length > 0 && (
            <div className="card p-4 mb-4">
              <div className="flex items-end justify-between mb-2">
                <p className="text-sm font-semibold text-slate-200">{t('plan.progress', { n: feitos, total: itens.length })}</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {Math.round((feitos / itens.length) * 100)}<span className="text-sm text-slate-500">%</span>
                </p>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-accent-500 transition-all"
                  style={{ width: `${(feitos / itens.length) * 100}%` }} />
              </div>
              {feitos === itens.length && <p className="text-xs text-emerald-300 mt-2">{t('plan.allDone')}</p>}
            </div>
          )}

          {/* ---------- O que ficou por fazer ---------- */}
          {porFazer.length > 0 && (
            <button onClick={trazerAtrasados} disabled={guardando}
              className="card w-full p-3.5 mb-4 flex items-center gap-3 text-left active:scale-[0.99] transition">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <Icon name="clock" className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-200">{t('plan.carryTitle', { n: porFazer.length })}</span>
                <span className="block text-xs text-slate-500">{t('plan.carryHint')}</span>
              </span>
              <Icon name="download" className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          )}

          {/* ---------- As tarefas da semana ---------- */}
          <div className="card p-4 mb-4">
            <p className="text-sm font-semibold text-slate-200 mb-2.5">{t('plan.tasks')}</p>

            {itens.length === 0 ? (
              <p className="text-sm text-slate-500 mb-3">{t('plan.noTasks')}</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {itens.map((x) => {
                  const c = x.course_id ? courseById[x.course_id] : null
                  return (
                    <div key={x.id} className="flex items-start gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5">
                      <button onClick={() => update(x.id, { done: !x.done }).catch(() => {})}
                        aria-label={t(x.done ? 'plan.markTodo' : 'plan.markDone')}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                          x.done ? 'bg-accent-500 border-accent-500' : 'border-white/30'
                        }`}>
                        {x.done && <Icon name="check" className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <span className="flex-1 min-w-0">
                        <span className={`block text-sm ${x.done ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                          {x.title}
                        </span>
                        {c && (
                          <span className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color || '#3d78bf' }} />
                            {c.name}
                          </span>
                        )}
                      </span>
                      <button onClick={() => remove(x.id).catch(() => {})}
                        aria-label={t('common.delete')}
                        className="p-1 -m-1 text-slate-500 hover:text-rose-400 shrink-0">
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <form onSubmit={adicionarEscrito} className="space-y-2">
              <div className="flex gap-2">
                <input className="input flex-1 min-w-0" placeholder={t('plan.addPlaceholder')}
                  value={texto} onChange={(e) => setTexto(e.target.value)} />
                <button className="btn-primary px-3 shrink-0" disabled={!texto.trim() || guardando}
                  aria-label={t('common.add')}>
                  <Icon name="plus" className="w-4 h-4" />
                </button>
              </div>
              <CourseSelect value={cadeira} onChange={setCadeira} />
            </form>
          </div>

          {/* ---------- Sugestões: prazos e provas ---------- */}
          {propostas.length > 0 && (
            <div className="card p-4 mb-4">
              <button onClick={() => setVerSugestoes(!verSugestoes)}
                className="w-full flex items-center justify-between text-left">
                <span>
                  <span className="block text-sm font-semibold text-slate-200">{t('plan.suggestions')}</span>
                  <span className="block text-xs text-slate-500">{t('plan.suggestionsHint')}</span>
                </span>
                <span className={`text-slate-500 transition ${verSugestoes ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {verSugestoes && (
                <div className="space-y-1.5 mt-3">
                  {propostas.map((s) => (
                    <button key={s.id} onClick={() => juntar(s.titulo, s.course_id)} disabled={guardando}
                      className="w-full flex items-start gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-left active:scale-[0.99] transition">
                      <Icon name="plus" className="w-4 h-4 text-nova-300 shrink-0 mt-0.5" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-slate-100">{s.titulo}</span>
                        <span className={`block text-[11px] mt-0.5 ${s.urgente ? 'text-amber-300' : 'text-slate-500'}`}>
                          {new Date(`${s.quando}T12:00:00`).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}
                          {s.tipo === 'exame' ? ` · ${t('plan.isExam')}` : ` · ${t('plan.isDeadline')}`}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------- Slides -> resumo ---------- */}
          <SlideSummary onSave={guardarResumo} onAddTask={juntar} guardando={guardando} />

          {/* ---------- Resumos guardados ---------- */}
          {resumos.length > 0 && (
            <div className="card p-4 mt-4">
              <p className="text-sm font-semibold text-slate-200 mb-2.5">{t('plan.savedSummaries')}</p>
              <div className="space-y-1.5">
                {resumos.map((n) => {
                  const { nome, texto: corpo } = summaryOf(n)
                  const dados = lerResumo(corpo)
                  const c = n.course_id ? courseById[n.course_id] : null
                  const estaAberto = aberto === n.id
                  return (
                    <div key={n.id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button onClick={() => setAberto(estaAberto ? null : n.id)} className="flex-1 min-w-0 text-left">
                          <span className="block text-sm font-medium text-slate-100 truncate">{n.title || nome}</span>
                          <span className="block text-[11px] text-slate-500">
                            {c ? c.name : t('plan.noCourse')}
                            {' · '}
                            {new Date(n.created_at).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}
                          </span>
                        </button>
                        <button onClick={() => remove(n.id).catch(() => {})}
                          aria-label={t('common.delete')}
                          className="p-1 text-slate-500 hover:text-rose-400 shrink-0">
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                      {estaAberto && (
                        <div className="px-3 pb-3 space-y-2.5 border-t border-white/10 pt-2.5">
                          {dados ? (
                            <>
                              <p className="text-sm text-slate-300 leading-relaxed">{dados.resumo}</p>
                              {(dados.topicos || []).map((topico, i) => (
                                <div key={i}>
                                  <p className="text-sm font-medium text-slate-100">{topico.titulo}</p>
                                  <ul className="mt-1 space-y-1">
                                    {(topico.pontos || []).map((p, j) => (
                                      <li key={j} className="text-sm text-slate-300 leading-relaxed flex gap-2">
                                        <span className="text-nova-400 shrink-0">·</span><span>{p}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                              {(dados.termos || []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t('plan.terms')}</p>
                                  {dados.termos.map((x, i) => (
                                    <p key={i} className="text-sm text-slate-300 leading-relaxed">
                                      <span className="font-semibold text-slate-100">{x.termo}</span> — {x.definicao}
                                    </p>
                                  ))}
                                </div>
                              )}
                              {(dados.perguntas || []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t('plan.questions')}</p>
                                  <ol className="space-y-1 list-decimal list-inside">
                                    {dados.perguntas.map((q, i) => (
                                      <li key={i} className="text-sm text-slate-300 leading-relaxed">{q}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              {(dados.tarefas || []).length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{t('plan.suggestedTasks')}</p>
                                  <div className="space-y-1.5">
                                    {dados.tarefas.map((tarefa, i) => (
                                      <button key={i} onClick={() => juntar(tarefa, n.course_id)} disabled={guardando}
                                        className="w-full flex items-start gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-left active:scale-[0.99] transition">
                                        <Icon name="plus" className="w-4 h-4 text-nova-300 shrink-0 mt-0.5" />
                                        <span className="text-sm text-slate-200 flex-1">{tarefa}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{corpo}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {itens.length === 0 && propostas.length === 0 && resumos.length === 0 && (
            <div className="mt-4">
              <EmptyState icon="book" title={t('plan.emptyTitle')} hint={t('plan.emptyHint')} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
