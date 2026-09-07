import { useMemo, useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PageHeader, Icon, Spinner, ErrorBox } from '../components/ui.jsx'
import Notebook from '../components/Notebook.jsx'
import { localeOf } from '../lib/helpers.js'
import { upcomingExams } from '../data/exams.js'
import { weekOf } from '../lib/week.js'
import { gerarPlano, totalMinutos, duracao } from '../lib/planner.js'
import {
  weekKeyOf, weekBounds, planBody, planMeta, planOfWeek, noteBody, summaryBody,
} from '../lib/plan.js'
import { corpoDeRevisao, linhaDeRevisao } from '../lib/revisao.js'
import { useT } from '../i18n/index.jsx'

export default function StudyPlan() {
  const { rows, loading, error, clearError, add, update, remove } = useCollection('notes', {
    orderBy: 'created_at', ascending: true,
  })
  const { rows: courses } = useCourses()
  const prazos = useCollection('assignments', { orderBy: 'due_date', ascending: true })
  const notas = useCollection('grades', { orderBy: 'created_at', ascending: true })
  const horario = useCollection('schedule_blocks', { orderBy: 'start_time', ascending: true })
  const { lang, academicYear, semester } = useAuth()
  const { t } = useT()

  const [aba, setAba] = useState('semana')          // semana | caderno
  const [offset, setOffset] = useState(0)           // 0 = esta semana
  const [texto, setTexto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [escrever, setEscrever] = useState(false)
  // undefined = ainda nao escolheu; entra na primeira cadeira em vez de abrir
  // o caderno vazio das notas sem cadeira.
  const [doCaderno, setDoCaderno] = useState(undefined)

  const semana = weekKeyOf(new Date(), offset)
  const anterior = weekKeyOf(new Date(), offset - 1)
  const { segunda, domingo } = weekBounds(semana)
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  const itens = planOfWeek(rows, semana)
  const feitos = itens.filter((x) => x.done).length
  const porFazer = planOfWeek(rows, anterior).filter((x) => !x.done)

  // Cadeiras deste semestre — as provas das outras já não interessam
  const desteSemestre = courses.filter((c) =>
    !c.is_equivalence && (!c.year || c.year === Number(academicYear)) && (!c.term || c.term === Number(semester)))
  const cadernoAberto = doCaderno === undefined
    ? ((desteSemestre[0] || courses[0])?.id ?? null)
    : doCaderno

  // Os dias desta semana como eles são mesmo (T1/T2, feriados, compensações):
  // é daqui que sai quanto tempo de aulas tem cada dia.
  const dias = useMemo(() => weekOf(horario.rows, new Date(), offset), [horario.rows, offset])

  // O plano proposto. Sai de uma conta com os prazos, as provas, o peso de cada
  // uma e as horas de aulas — não de o aluno se lembrar do que tem para fazer.
  const proposto = useMemo(() => gerarPlano({
    semana,
    dias,
    courses: desteSemestre.length ? desteSemestre : courses,
    assignments: prazos.rows,
    exames: upcomingExams(desteSemestre.length ? desteSemestre : courses, segunda),
    grades: notas.rows,
    jaNoPlano: itens.map((x) => x.title),
    t,
  }), [semana, dias, courses, prazos.rows, notas.rows, itens, t]) // eslint-disable-line react-hooks/exhaustive-deps

  const intervalo = (() => {
    const fmt = (d) => d.toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })
    return `${fmt(segunda)} – ${fmt(domingo)}`
  })()

  const diaCurto = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(localeOf(lang), { weekday: 'long', day: 'numeric' })

  async function juntar(titulo, course_id = null, dia = null, minutos = null) {
    if (!String(titulo || '').trim()) return
    setGuardando(true)
    try {
      await add({
        title: String(titulo).trim(), body: planBody(semana, dia, minutos),
        course_id: course_id || null, is_task: true, done: false,
      })
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  async function usarPlano() {
    setGuardando(true)
    try {
      for (const x of proposto) {
        await add({
          title: x.titulo, body: planBody(semana, x.dia, x.minutos),
          course_id: x.course_id || null, is_task: true, done: false,
        })
      }
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  async function adicionarEscrito(e) {
    e.preventDefault()
    const v = texto.trim()
    if (!v) return
    setTexto('')
    await juntar(v)
  }

  // Trazer o que ficou por fazer: mudar de semana é só reescrever o marcador.
  async function trazerAtrasados() {
    setGuardando(true)
    try {
      for (const x of porFazer) {
        const { minutos } = planMeta(x)
        await update(x.id, { body: planBody(semana, null, minutos) })
      }
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

  async function guardarNota(titulo, corpo, course_id) {
    setGuardando(true)
    try {
      await add({
        title: titulo, body: noteBody(titulo, corpo),
        course_id: course_id || null, is_task: false, done: false,
      })
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  // O estado da revisão de uma cadeira vive numa linha só, reescrita no fim de
  // cada sessão.
  async function guardarRevisao(courseId, estado) {
    const linha = linhaDeRevisao(rows, courseId)
    setGuardando(true)
    try {
      if (linha) await update(linha.id, { body: corpoDeRevisao(estado) })
      else {
        await add({
          title: t('quiz.open'), body: corpoDeRevisao(estado),
          course_id: courseId || null, is_task: false, done: false,
        })
      }
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  // O caderno de exercícios de uma cadeira: uma linha só, reescrita a cada
  // mudança (marcar um exercício, ler um capítulo, juntar as soluções).
  async function guardarHandbook(linha, body, nome, courseId) {
    setGuardando(true)
    try {
      if (linha) await update(linha.id, { title: nome || linha.title, body })
      else {
        await add({
          title: nome || t('hb.title'), body,
          course_id: courseId || null, is_task: false, done: false,
        })
      }
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  async function editarNota(id, titulo, corpo) {
    setGuardando(true)
    try {
      await update(id, { title: titulo, body: noteBody(titulo, corpo) })
    } catch { /* mensagem ja em `error` */ } finally { setGuardando(false) }
  }

  // As tarefas guardadas, pela ordem do dia que lhes foi dado (as escritas à
  // mão não têm dia e vão para o fim).
  const porDia = (() => {
    const grupos = new Map()
    for (const x of itens) {
      const { dia } = planMeta(x)
      const chave = dia || 'zz'
      if (!grupos.has(chave)) grupos.set(chave, [])
      grupos.get(chave).push(x)
    }
    return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  })()

  const carregando = loading || prazos.loading || notas.loading || horario.loading

  return (
    <div className="pb-24">
      <PageHeader title={t('nav.plan')} subtitle={t(aba === 'semana' ? 'plan.subtitle' : 'note.subtitle')} />

      <ErrorBox error={error || prazos.error} onClose={() => { clearError(); prazos.clearError() }} className="mb-4" />

      {/* Duas coisas diferentes: o que há para fazer, e onde fica a matéria. */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setAba('semana')}
          className={`py-2.5 seg ${aba === 'semana' ? 'seg-on' : 'seg-off'}`}>{t('plan.tabWeek')}</button>
        <button onClick={() => setAba('caderno')}
          className={`py-2.5 seg ${aba === 'caderno' ? 'seg-on' : 'seg-off'}`}>{t('plan.tabNotebook')}</button>
      </div>

      {aba === 'semana' && (<>
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

        {carregando ? <Spinner /> : (
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

            {/* ---------- O plano proposto ---------- */}
            {proposto.length > 0 && (
              <div className="card p-4 mb-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="text-sm font-semibold text-slate-200">
                    {itens.length ? t('planner.moreTitle') : t('planner.title')}
                  </p>
                  <span className="text-xs text-slate-400 tabular-nums shrink-0 mt-0.5">
                    {duracao(totalMinutos(proposto), t)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-3">{t('planner.hint')}</p>

                <div className="space-y-3">
                  {[...new Set(proposto.map((x) => x.dia))].map((dia) => (
                    <div key={dia}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                        {diaCurto(dia)}
                      </p>
                      <div className="space-y-1.5">
                        {proposto.filter((x) => x.dia === dia).map((x) => (
                          <button key={x.chave} onClick={() => juntar(x.titulo, x.course_id, x.dia, x.minutos)}
                            disabled={guardando}
                            className="w-full flex items-start gap-2.5 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-left active:scale-[0.99] transition">
                            <Icon name="plus" className="w-4 h-4 text-nova-300 shrink-0 mt-0.5" />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm text-slate-100">{x.titulo}</span>
                              <span className="block text-[11px] text-slate-500 mt-0.5">
                                {duracao(x.minutos, t)} · {x.porque}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={usarPlano} disabled={guardando}
                  className="btn-primary w-full py-2.5 mt-3 disabled:opacity-60">
                  {guardando ? t('common.saving') : itens.length ? t('planner.addAll') : t('planner.use')}
                </button>
              </div>
            )}

            {/* ---------- O plano guardado ---------- */}
            {itens.length > 0 && (
              <div className="card p-4 mb-4">
                <p className="text-sm font-semibold text-slate-200 mb-2.5">{t('plan.tasks')}</p>
                <div className="space-y-3">
                  {porDia.map(([dia, lista]) => (
                    <div key={dia}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                        {dia === 'zz' ? t('plan.anyDay') : diaCurto(dia)}
                      </p>
                      <div className="space-y-1.5">
                        {lista.map((x) => {
                          const c = x.course_id ? courseById[x.course_id] : null
                          const { minutos } = planMeta(x)
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
                                <span className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                  {minutos ? <span className="tabular-nums">{duracao(minutos, t)}</span> : null}
                                  {c && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color || '#3d78bf' }} />
                                      {c.name}
                                    </span>
                                  )}
                                </span>
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
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------- Nada a propor ---------- */}
            {proposto.length === 0 && itens.length === 0 && (
              <div className="card p-4 mb-4">
                <p className="text-sm font-semibold text-slate-200">{t('planner.nothingTitle')}</p>
                <p className="text-xs text-slate-500 mt-1">{t('planner.nothingHint')}</p>
              </div>
            )}

            {/* ---------- Escrever à mão: fica para quem quer mesmo ---------- */}
            {escrever ? (
              <form onSubmit={adicionarEscrito} className="card p-4 flex gap-2">
                <input className="input flex-1 min-w-0" autoFocus placeholder={t('plan.addPlaceholder')}
                  value={texto} onChange={(e) => setTexto(e.target.value)} />
                <button className="btn-primary px-3 shrink-0" disabled={!texto.trim() || guardando}
                  aria-label={t('common.add')}>
                  <Icon name="plus" className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button onClick={() => setEscrever(true)}
                className="w-full text-center text-xs text-slate-500 py-2">
                {t('plan.addOwn')}
              </button>
            )}
          </>
        )}
      </>)}

      {/* ---------- Caderno ---------- */}
      {aba === 'caderno' && (
        loading ? <Spinner /> : (
          <Notebook
            rows={rows} courses={courses} cadeira={cadernoAberto}
            onEscolherCadeira={setDoCaderno}
            onGuardarNota={guardarNota} onEditarNota={editarNota}
            onApagar={(id) => remove(id).catch(() => {})}
            onGuardarResumo={guardarResumo} onAddTask={juntar}
            onGuardarRevisao={guardarRevisao} onGuardarHandbook={guardarHandbook}
            guardando={guardando} />
        )
      )}
    </div>
  )
}
