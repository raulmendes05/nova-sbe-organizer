import { useState } from 'react'
import { useCollection } from '../lib/useCollection.js'
import { useCourses } from '../context/CoursesContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { PageHeader, Fab, Modal, Spinner, EmptyState, Icon, ErrorBox } from '../components/ui.jsx'
import CoursePicker from '../components/CoursePicker.jsx'
import GoalCard from '../components/GoalCard.jsx'
import ErasmusGpa from '../components/ErasmusGpa.jsx'
import CwiModules from '../components/CwiModules.jsx'
import PassFailCourse from '../components/PassFailCourse.jsx'
import DuplicateCourses from '../components/DuplicateCourses.jsx'
import { localeOf, COURSE_COLORS, gradedWeight, resolveGrade, termLabel, termKey, simulateGrade, weightedAvg, isCwi, isPassFail, passFailEcts, passRow, PASS_MARK, checkNumber, LIMITS } from '../lib/helpers.js'
import { cwiTitle, cwiRow, cwiDone, CWI_MODULES } from '../data/cwi.js'
import { assessmentFor, partsFor, partFor, passMarkFor, PASS_DEFAULT } from '../data/assessments.js'
import { useT } from '../i18n/index.jsx'

const YEAR_OPTS = [1, 2, 3]
const TERM_OPTS = [1, 2]

function gradeColor(avg) {
  if (avg === null) return 'text-slate-500'
  if (avg < 9.5) return 'text-rose-400'
  if (avg < 14) return 'text-amber-400'
  return 'text-emerald-400'
}

export default function Grades() {
  const { rows: courses, add: addCourse, update: updateCourse, remove: removeCourse, loading: coursesLoading,
    error: coursesError, clearError: clearCoursesError } = useCourses()
  const { rows: grades, loading: gradesLoading, add: addGrade, update: updateGrade, remove: removeGrade,
    error: gradesError, clearError: clearGradesError } = useCollection('grades', { orderBy: 'created_at', ascending: true })
  // Cadeiras e componentes falham pelos mesmos motivos (rede, RLS) — uma
  // caixa chega para os dois.
  const error = coursesError || gradesError
  const clearError = () => { clearCoursesError(); clearGradesError() }
  const { academicYear, semester, goalAvg, currentTermKey, updateGoal, lang } = useAuth()
  const { t } = useT()
  const defYear = Number(academicYear) || null
  const defTerm = Number(semester) || null

  const [tab, setTab] = useState('semesters') // semesters | equivalences
  const [expanded, setExpanded] = useState(null)
  const [openGroups, setOpenGroups] = useState(() => new Set([termKey(defYear, defTerm)]))
  const toggleGroup = (k) => setOpenGroups((prev) => {
    const next = new Set(prev)
    next.has(k) ? next.delete(k) : next.add(k)
    return next
  })
  const [finalDraft, setFinalDraft] = useState('')
  const [avisoNota, setAvisoNota] = useState(null)   // nota fora da escala 0–20
  const [avisoForm, setAvisoForm] = useState(null)   // nos modais
  const [showComps, setShowComps] = useState(false)
  const [simTarget, setSimTarget] = useState('') // objetivo do simulador (0-20)
  const [courseModal, setCourseModal] = useState(false)
  const [courseForm, setCourseForm] = useState({ name: '', code: '', ects: 6, professor: '', year: null, term: null, is_equivalence: false })
  const [courseEditId, setCourseEditId] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const existingCodes = new Set(courses.map((c) => c.code).filter(Boolean))

  const [gradeModal, setGradeModal] = useState(false)
  const [gradeForm, setGradeForm] = useState({ course_id: null, title: '', weight: '', grade: '' })
  const [gradeEditId, setGradeEditId] = useState(null)

  const compsOf = (courseId) => grades.filter((g) => g.course_id === courseId)

  function toggleExpand(c) {
    const open = expanded === c.id
    setExpanded(open ? null : c.id)
    setShowComps(false)
    setAvisoNota(null)
    setFinalDraft(open ? '' : (c.final_grade ?? null) === null ? '' : String(c.final_grade))
  }

  async function saveFinal(c) {
    // A escala é 0–20: um 38 não é uma nota, é um engano — e o max do <input>
    // não chega para o travar, porque isto guarda-se ao sair do campo.
    const mal = checkNumber(finalDraft, LIMITS.grade, t)
    if (mal) { setAvisoNota(mal); return }
    setAvisoNota(null)
    const v = finalDraft.trim() === '' ? null : Number(finalDraft)
    const cur = c.final_grade ?? null
    if (v === cur) return
    try { await updateCourse(c.id, { final_grade: v }) } catch { /* mensagem ja em `error` */ }
  }

  // Equivalencias vao para um separador proprio, mas contam para a media/ECTS
  const perCourse = courses.map((c) => ({ c, avg: resolveGrade(c, compsOf(c.id)) }))
  const regular = perCourse.filter((x) => !x.c.is_equivalence)
  const equivalences = perCourse.filter((x) => x.c.is_equivalence)

  // Media global — todas as cadeiras com nota (incl. equivalencias)
  const withAvg = perCourse.filter((x) => x.avg !== null)
  const totalEcts = withAvg.reduce((s, x) => s + Number(x.c.ects || 0), 0)
  const globalAvg = totalEcts > 0
    ? withAvg.reduce((s, x) => s + x.avg * Number(x.c.ects || 0), 0) / totalEcts
    : null

  // Para a GPA de Erasmus, a folha da escola nao trata as equivalencias a
  // parte: o que decide e a nota da linha. Com um numero, a cadeira entra na
  // media (os 75%) E nos creditos; marcada Pass/Fail — que e como as cadeiras
  // de Erasmus voltam — vale so os creditos (os 25%).
  // Ver o "GPA Calculators Bachelors": Weight so conta linhas com ISNUMBER,
  // mas Completed ECTs conta toda a linha com a celula da nota preenchida.
  const ectsPassFail = perCourse.reduce(
    (s, x) => s + passFailEcts(x.c, compsOf(x.c.id)), 0)
  const ectsFeitos = totalEcts + ectsPassFail
  // So para explicar a soma a quem tem equivalencias.
  const comEquivalencia = perCourse.filter((x) =>
    x.c.is_equivalence && (x.avg !== null || passFailEcts(x.c, compsOf(x.c.id)) > 0))
  const ectsEquivalencias = comEquivalencia.reduce((s, x) => s + Number(x.c.ects || 0), 0)
  // Os modulos Pass/Fail da Nova (Careers with Impact, Data Handling) tem a sua
  // propria linha; sem isto, uma equivalencia Pass aparecia contada nas duas.
  const ectsPassFailNova = perCourse.reduce(
    (s, x) => s + (x.c.is_equivalence ? 0 : passFailEcts(x.c, compsOf(x.c.id))), 0)

  // Agrupar regulares por ano/semestre
  const groups = Object.values(
    regular.reduce((acc, item) => {
      const k = termKey(item.c.year, item.c.term)
      if (!acc[k]) acc[k] = { key: k, label: termLabel(item.c.year, item.c.term, t), items: [] }
      acc[k].items.push(item)
      return acc
    }, {})
  ).sort((a, b) => a.key - b.key)

  // Média do semestre atual (o do perfil) — é o que o objetivo mede
  const currentItems = regular.filter((x) => termKey(x.c.year, x.c.term) === currentTermKey)
  const currentAvg = weightedAvg(currentItems.map((x) => ({ ects: x.c.ects, avg: x.avg })))

  // ----- cadeira -----
  function openNewCourse(isEquiv = false) {
    setCourseForm({ name: '', code: '', ects: 6, professor: '', year: isEquiv ? null : defYear, term: isEquiv ? null : defTerm, is_equivalence: isEquiv })
    setCourseEditId(null); setAvisoForm(null); setCourseModal(true)
  }
  function openEditCourse(c) {
    setCourseForm({ name: c.name, code: c.code || '', ects: c.ects ?? 6, professor: c.professor || '', year: c.year ?? null, term: c.term ?? null, is_equivalence: c.is_equivalence ?? false })
    setCourseEditId(c.id); setAvisoForm(null); setCourseModal(true)
  }

  async function pickFromCatalog(course) {
    const color = COURSE_COLORS[courses.length % COURSE_COLORS.length]
    try {
      await addCourse({ name: course.name, code: course.code, ects: course.ects, color, year: defYear, term: defTerm })
    } catch { /* mensagem ja em `error` */ }
  }
  function openManual() { setPickerOpen(false); openNewCourse(false) }

  async function saveCourse(e) {
    e.preventDefault()
    const mal = checkNumber(courseForm.ects, LIMITS.ects, t, { required: true })
    if (mal) { setAvisoForm(mal); return }
    setAvisoForm(null)
    const payload = { ...courseForm, ects: Number(courseForm.ects) || 0 }
    if (payload.is_equivalence) { payload.year = null; payload.term = null }
    try {
      if (courseEditId) await updateCourse(courseEditId, payload)
      else {
        payload.color = COURSE_COLORS[courses.length % COURSE_COLORS.length]
        await addCourse(payload)
      }
      setCourseModal(false)
    } catch { /* o modal fica aberto com a mensagem a vista */ }
  }
  async function deleteCourse(id) {
    if (!confirm(t('grades.confirmDeleteCourse'))) return
    try { await removeCourse(id) } catch { /* mensagem ja em `error` */ }
  }

  // FAB: catalogo (semestres) ou formulario de equivalencia
  function onFab() {
    if (tab === 'equivalences') openNewCourse(true)
    else setPickerOpen(true)
  }

  // ----- componente de avaliacao -----
  function openNewGrade(courseId) { setGradeForm({ course_id: courseId, title: '', weight: '', grade: '' }); setGradeEditId(null); setAvisoForm(null); setGradeModal(true) }
  function openEditGrade(g) { setGradeForm({ course_id: g.course_id, title: g.title, weight: g.weight ?? '', grade: g.grade ?? '' }); setGradeEditId(g.id); setAvisoForm(null); setGradeModal(true) }
  async function saveGrade(e) {
    e.preventDefault()
    const mal = checkNumber(gradeForm.weight, LIMITS.weight, t, { required: true })
      || checkNumber(gradeForm.grade, LIMITS.grade, t)
    if (mal) { setAvisoForm(mal); return }
    setAvisoForm(null)
    const payload = {
      course_id: gradeForm.course_id,
      title: gradeForm.title,
      weight: Number(gradeForm.weight) || 0,
      grade: gradeForm.grade === '' ? null : Number(gradeForm.grade),
    }
    try {
      if (gradeEditId) await updateGrade(gradeEditId, payload)
      else await addGrade(payload)
      setGradeModal(false)
    } catch { /* o modal fica aberto com a mensagem a vista */ }
  }

  // ----- Careers with Impact: 4 modulos feito/nao feito -----
  // Cada modulo concluido e uma linha em `grades` (sem nota, peso 0): existe =
  // feito. Assim nao ha nota nenhuma inventada na base de dados.
  async function toggleCwi(course, id, feito) {
    try {
      if (feito) await addGrade({ course_id: course.id, title: cwiTitle(id), weight: 0, grade: null })
      else {
        const row = cwiRow(compsOf(course.id), id)
        if (row) await removeGrade(row.id)
      }
    } catch { /* mensagem ja em `error` */ }
  }

  // Cadeira Pass/Fail simples (Data Handling): a linha existe = está feita.
  async function togglePasse(course, feita) {
    try {
      if (feita) await addGrade({ course_id: course.id, title: PASS_MARK, weight: 0, grade: null })
      else {
        const row = passRow(compsOf(course.id))
        if (row) await removeGrade(row.id)
      }
    } catch { /* mensagem ja em `error` */ }
  }

  // As componentes do syllabus de uma vez. Uma a uma e pela ordem do syllabus
  // porque a lista vem ordenada por created_at — inserir tudo de enfiada
  // deixava-as baralhadas no ecra.
  async function preencherSyllabus(course) {
    try {
      for (const parte of partsFor(course, t)) await addGrade({ course_id: course.id, ...parte })
    } catch { /* mensagem ja em `error` */ }
  }

  // Limpa o que sobrou de quando a app tratava esta cadeira como as outras:
  // a nota final e as componentes de avaliacao que nao sao modulos.
  async function limparCwi(course) {
    const marcas = new Set([...CWI_MODULES.map((m) => cwiTitle(m.id)), PASS_MARK])
    try {
      for (const g of compsOf(course.id)) if (!marcas.has(String(g.title).trim())) await removeGrade(g.id)
      if ((course.final_grade ?? null) !== null) await updateCourse(course.id, { final_grade: null })
    } catch { /* mensagem ja em `error` */ }
  }

  const loading = coursesLoading || gradesLoading

  // ----- cartao de uma cadeira (reutilizado nos dois separadores) -----
  function courseCard({ c, avg }) {
    const comps = compsOf(c.id)
    const gw = gradedWeight(comps)
    const isOpen = expanded === c.id
    const usesComponents = (c.final_grade ?? null) === null && comps.length > 0
    // Careers with Impact nao tem nota: no lugar dela vao os 4 modulos.
    const cwi = isCwi(c)
    const cwiFeitos = cwi ? cwiDone(comps).length : 0
    // Data Handling: Pass/Fail sem módulos — feita ou por fazer.
    const passe = isPassFail(c) && !cwi
    const passeFeita = passe && Boolean(passRow(comps))
    const restos = comps.filter((g) => String(g.title).trim() !== PASS_MARK).length
    // O syllabus oficial desta cadeira, se o conhecermos: pesos, minimos e a
    // nota a que passa.
    const syllabus = assessmentFor(c)
    const notaPasse = passMarkFor(c)
    // 9,45 em portugues, 9.45 em ingles — a nota aparece em texto corrido.
    const passeEscrito = notaPasse.toLocaleString(localeOf(lang))
    // Equivalencia que voltou sem nota (Erasmus): vale creditos, nao vale media.
    const equivPasse = Boolean(c.is_equivalence) && Boolean(passRow(comps))
    return (
      <div key={c.id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
        <button onClick={() => toggleExpand(c)} className="w-full p-3.5 flex items-center gap-3 text-left">
          <div className="w-1.5 h-10 rounded-full" style={{ background: c.color || '#3d78bf', boxShadow: `0 0 10px ${c.color || '#3d78bf'}55` }} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 truncate">{c.name}</p>
            <p className="text-xs text-slate-400">
              {c.ects} ECTS
              {cwi || passe || equivPasse
                ? <> · {t('grades.passFail')}</>
                : usesComponents && <> · {t('grades.assessedPct', { n: gw })}</>}
            </p>
          </div>
          <div className="text-right">
            {cwi ? (
              <p className={`text-xl font-bold tabular-nums ${cwiFeitos === CWI_MODULES.length ? 'text-emerald-400' : 'text-slate-300'}`}>
                {cwiFeitos}<span className="text-slate-500 text-sm">/{CWI_MODULES.length}</span>
              </p>
            ) : passe || equivPasse ? (
              <p className={`text-sm font-bold ${passeFeita || equivPasse ? 'text-emerald-400' : 'text-slate-500'}`}>
                {passeFeita || equivPasse ? t('passfail.done') : t('passfail.todo')}
              </p>
            ) : (
              <p className={`text-xl font-bold ${gradeColor(avg)}`}>{avg !== null ? avg.toFixed(1) : '—'}</p>
            )}
          </div>
        </button>

        {isOpen && cwi && (
          <div className="border-t border-white/10 p-3.5 bg-white/[0.02] space-y-3.5">
            <CwiModules rows={comps} onToggle={(id, feito) => toggleCwi(c, id, feito)}
              notaAntiga={c.final_grade ?? null} onLimpar={() => limparCwi(c)} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEditCourse(c)} className="btn-ghost flex-1 py-2 text-sm">
                <Icon name="edit" className="w-4 h-4" /> {t('grades.editCourse')}
              </button>
              <button onClick={() => deleteCourse(c.id)} className="btn-ghost px-3 py-2 text-sm text-rose-400">
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isOpen && passe && (
          <div className="border-t border-white/10 p-3.5 bg-white/[0.02] space-y-3.5">
            <PassFailCourse course={c} feita={passeFeita} onToggle={(v) => togglePasse(c, v)}
              notaAntiga={c.final_grade ?? null} restos={restos} onLimpar={() => limparCwi(c)} />
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEditCourse(c)} className="btn-ghost flex-1 py-2 text-sm">
                <Icon name="edit" className="w-4 h-4" /> {t('grades.editCourse')}
              </button>
              <button onClick={() => deleteCourse(c.id)} className="btn-ghost px-3 py-2 text-sm text-rose-400">
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isOpen && !cwi && !passe && (
          <div className="border-t border-white/10 p-3.5 bg-white/[0.02] space-y-3.5">
            {/* As cadeiras de Erasmus voltam convertidas em Pass/Fail: os
                creditos contam, a nota nao. Sem isto, ou se inventava uma nota
                ou se perdiam os ECTS. */}
            {c.is_equivalence && (
              <button type="button" onClick={() => togglePasse(c, !equivPasse)}
                className={`w-full flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left border transition ${
                  equivPasse ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/[0.04] border-white/10'
                }`}>
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  equivPasse ? 'bg-emerald-500 border-emerald-500' : 'border-white/30'
                }`}>
                  {equivPasse && <Icon name="check" className="w-3.5 h-3.5 text-white" />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-slate-100">{t('grades.equivPass')}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{t('grades.equivPassHint')}</span>
                </span>
              </button>
            )}

            {!equivPasse && (<>
            <div>
              <label className="label">{t('grades.finalGrade')}</label>
              <input type="number" step="0.1" min="0" max="20" inputMode="decimal"
                aria-invalid={avisoNota ? 'true' : undefined}
                className={`input text-lg font-semibold ${avisoNota ? 'border-rose-500/60' : ''}`}
                placeholder={t('grades.noGradeYet')}
                value={finalDraft}
                onChange={(e) => { setFinalDraft(e.target.value); if (avisoNota) setAvisoNota(null) }}
                onBlur={() => saveFinal(c)} />
              {avisoNota && <p role="alert" className="text-xs text-rose-300 mt-1.5">{avisoNota}</p>}
            </div>

            <div>
              <button onClick={() => setShowComps(!showComps)}
                className="w-full flex items-center justify-between text-sm text-slate-300 hover:text-white py-1">
                <span className="font-medium">{t('grades.breakdown')} {usesComponents && <span className="text-slate-500">({t('grades.counting')})</span>}</span>
                <span className={`transition ${showComps ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {showComps && (
                <div className="mt-1.5">
                  <p className="text-xs text-slate-500 mb-2">
                    {t('grades.breakdownHint')}
                  </p>
                  {comps.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {comps.map((g) => (
                        <div key={g.id}>
                          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/5 rounded-lg px-3 py-2">
                            <div className="flex-1 min-w-0" onClick={() => openEditGrade(g)}>
                              <p className="text-sm font-medium text-slate-200 truncate">{g.title}</p>
                              <p className="text-xs text-slate-500">{t('grades.weight', { n: g.weight })}</p>
                            </div>
                            <span className={`font-bold ${g.grade === null ? 'text-slate-500' : gradeColor(Number(g.grade))}`}>
                              {g.grade === null ? '—' : Number(g.grade).toFixed(1)}
                            </span>
                            <button onClick={() => removeGrade(g.id).catch(() => {})} className="p-1 text-slate-500 hover:text-rose-400">
                              <Icon name="trash" className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Nota minima da componente: e a regra que reprova
                              gente com media positiva. */}
                          {(() => {
                            const parte = partFor(c, g, t)
                            if (!parte?.min) return null
                            const abaixo = g.grade !== null && Number(g.grade) < parte.min
                            return (
                              <p className={`text-[11px] mt-1 px-1 ${abaixo ? 'text-rose-300' : 'text-slate-500'}`}>
                                {abaixo ? t('assess.below', { n: parte.min }) : t('assess.min', { n: parte.min })}
                              </p>
                            )
                          })()}
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Copiar os pesos do syllabus a mao e onde se erra — e onde
                      se desiste. Um toque quando ainda nao ha nada gravado. */}
                  {syllabus && comps.length === 0 && (
                    <button onClick={() => preencherSyllabus(c)}
                      className="w-full rounded-xl bg-nova-500/15 border border-nova-500/30 px-3 py-2.5 mb-2 text-left active:scale-[0.99] transition">
                      <span className="flex items-center gap-2 text-sm font-semibold text-nova-100">
                        <Icon name="spark" className="w-4 h-4" /> {t('assess.fill')}
                      </span>
                      <span className="block text-xs text-slate-400 mt-0.5">
                        {t('assess.fillHint', {
                          lista: syllabus.parts.map((x) => `${t(x.key)} ${x.weight}%`).join(', '),
                        })}
                      </span>
                    </button>
                  )}

                  <button onClick={() => openNewGrade(c.id)} className="btn-ghost w-full py-2 text-sm">
                    <Icon name="plus" className="w-4 h-4" /> {t('grades.addComponent')}
                  </button>

                  {/* Regras que nao cabem em pesos: quizzes que caem, recurso
                      que vale tudo, cadeiras que nao passam a 9,5. */}
                  {syllabus && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t('assess.title')}
                      </p>
                      {notaPasse !== PASS_DEFAULT && (
                        <p className="text-[11px] text-amber-200/80">{t('assess.pass', { n: passeEscrito })}</p>
                      )}
                      {(syllabus.notes || []).map((k) => (
                        <p key={k} className="text-[11px] text-slate-500">{t(k)}</p>
                      ))}
                    </div>
                  )}

                  {/* Simulador — que nota preciso? */}
                  {comps.length > 0 && (() => {
                    const pass = simulateGrade(comps, notaPasse)
                    const malAlvo = checkNumber(simTarget, LIMITS.grade, t)
                    const goal = !malAlvo && simTarget !== '' ? simulateGrade(comps, Number(simTarget)) : null
                    const line = (sim) => {
                      if (!sim || sim.done) return { txt: t('grades.simDone'), cls: 'text-slate-400' }
                        if (sim.guaranteed) return { txt: t('grades.simGuaranteed'), cls: 'text-emerald-300' }
                        if (sim.impossible) return { txt: t('grades.simImpossible', { pct: sim.remainingPct }), cls: 'text-rose-300' }
                        return { txt: t('grades.simNeeded', { n: sim.needed.toFixed(1), pct: sim.remainingPct }), cls: 'text-slate-100' }
                    }
                    const p = line(pass)
                    const g = goal ? line(goal) : null
                    return (
                      <div className="mt-3 rounded-xl bg-nova-500/10 border border-nova-500/25 p-3">
                        <p className="text-xs font-semibold text-nova-200 mb-2">🎯 {t('grades.simTitle')}</p>
                        <p className={`text-sm ${p.cls}`}><span className="text-slate-400">{t('grades.simToPass', { n: passeEscrito })}</span> {p.txt}</p>
                        <div className="flex items-center gap-2 mt-2.5">
                          <label className="text-sm text-slate-400">{t('grades.simTarget')}</label>
                          <input type="number" step="0.5" min="0" max="20" inputMode="decimal"
                            className="input w-20 py-1.5 text-sm" placeholder={t('grades.simPlaceholder')}
                            value={simTarget} onChange={(e) => setSimTarget(e.target.value)} />
                          <span className="text-sm text-slate-500">/ 20</span>
                        </div>
                        {malAlvo && <p role="alert" className="text-xs text-rose-300 mt-2">{malAlvo}</p>}
                        {g && <p className={`text-sm mt-2 ${g.cls}`}><span className="text-slate-400">{t('grades.simFor', { n: Number(simTarget) })}</span> {g.txt}</p>}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            </>)}

            <div className="flex gap-2 pt-1">
              <button onClick={() => openEditCourse(c)} className="btn-ghost flex-1 py-2 text-sm">
                <Icon name="edit" className="w-4 h-4" /> {t('grades.editCourse')}
              </button>
              <button onClick={() => deleteCourse(c.id)} className="btn-ghost px-3 py-2 text-sm text-rose-400">
                <Icon name="trash" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('nav.grades')} subtitle={t('grades.subtitle')} />

      <ErrorBox error={error} onClose={clearError} className="mb-4" />

      {/* A mesma cadeira duas vezes conta a dobrar na média — avisa e junta */}
      <DuplicateCourses />

      {/* Cartao media global */}
      <div className="relative overflow-hidden rounded-3xl p-5 mb-4 shadow-glow"
        style={{ backgroundImage: 'linear-gradient(135deg, #1f5aa3 0%, #0f3663 55%, #0a2540 100%)' }}>
        <div className="absolute -top-10 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 -left-6 w-40 h-40 rounded-full bg-accent-400/20 blur-2xl" />
        <div className="relative">
          <p className="text-nova-100/90 text-sm font-medium">{t('home.avg')}</p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-5xl font-bold text-white tracking-tight">{globalAvg !== null ? globalAvg.toFixed(2) : '—'}</span>
            <span className="text-nova-200 mb-1.5 font-medium">/ 20</span>
          </div>
          <p className="text-nova-200/80 text-xs mt-2">
            {t('home.avgSub', { n: withAvg.length, total: courses.length, ects: totalEcts })}
          </p>
        </div>
      </div>

      {/* Objetivo de média do semestre atual */}
      <div className="mb-4">
        <GoalCard current={currentAvg} goal={goalAvg} onSave={updateGoal}
          subtitle={termLabel(defYear, defTerm, t)} />
      </div>

      {/* Candidatura a mobilidade: outra metrica, a partir dos mesmos numeros */}
      <div className="mb-4">
        <ErasmusGpa gpa={globalAvg} ects={ectsFeitos} ectsPassFail={ectsPassFailNova}
          ectsEquivalencias={ectsEquivalencias} equivalencias={comEquivalencia.length} />
      </div>

      {/* Separadores */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('semesters')} className={`flex-1 py-2 seg ${tab === 'semesters' ? 'seg-on' : 'seg-off'}`}>{t('grades.semesters')}</button>
        <button onClick={() => setTab('equivalences')} className={`flex-1 py-2 seg ${tab === 'equivalences' ? 'seg-on' : 'seg-off'}`}>
          {t('grades.equivalences')}{equivalences.length > 0 && <span className="ml-1 opacity-70">· {equivalences.length}</span>}
        </button>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'semesters' ? (
        groups.length === 0 ? (
          <EmptyState icon="chart" title={t('grades.emptyTitle')} hint={t('grades.emptyHint')} />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const open = openGroups.has(group.key)
              const graded = group.items.filter((x) => x.avg !== null)
              const gEcts = graded.reduce((s, x) => s + Number(x.c.ects || 0), 0)
              const gAvg = gEcts > 0 ? graded.reduce((s, x) => s + x.avg * Number(x.c.ects || 0), 0) / gEcts : null
              return (
                <section key={group.key} className="card overflow-hidden">
                  <button onClick={() => toggleGroup(group.key)} className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-100">{group.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t('grades.courseCount', { n: group.items.length })}
                          {gAvg !== null && <> · {t('grades.average')} <span className={gradeColor(gAvg)}>{gAvg.toFixed(1)}</span></>}
                      </p>
                    </div>
                    <span className={`text-slate-400 text-lg transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {open && (
                    <div className="border-t border-white/10 p-2.5 space-y-2.5 bg-white/[0.02]">
                      {group.items.map(courseCard)}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )
      ) : (
        // Separador Equivalências
        equivalences.length === 0 ? (
          <EmptyState icon="note" title={t('grades.emptyEquiv')} hint={t('grades.emptyEquivHint')} />
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-500 px-0.5">{t('grades.equivHint')}</p>
            {equivalences.map(courseCard)}
          </div>
        )
      )}

      <Fab onClick={onFab} label={tab === 'equivalences' ? t('grades.newEquiv') : t('grades.newCourse')} />

      {/* Modal cadeira */}
      <Modal open={courseModal} onClose={() => setCourseModal(false)} title={courseEditId ? t('grades.editCourse') : courseForm.is_equivalence ? t('grades.newEquiv') : t('grades.newCourse')}>
        <form onSubmit={saveCourse} className="space-y-3">
          <div>
            <label className="label">{t('schedule.name')}{courseForm.code && <span className="text-slate-500 font-normal"> · #{courseForm.code}</span>}</label>
            <input className="input" required placeholder={t('grades.namePlaceholder')}
              value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} />
          </div>

          {/* Equivalencia */}
          <button type="button" onClick={() => setCourseForm({ ...courseForm, is_equivalence: !courseForm.is_equivalence })}
            className="w-full flex items-center gap-3 text-left rounded-xl bg-white/[0.05] border border-white/10 p-3">
            <span className={`w-6 h-6 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition ${courseForm.is_equivalence ? 'bg-accent-500 border-accent-500' : 'border-white/30'}`}>
              {courseForm.is_equivalence && <Icon name="check" className="w-4 h-4 text-white" />}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-100">{t('grades.equivToggle')}</span>
              <span className="block text-xs text-slate-500">{t('grades.equivToggleHint')}</span>
            </span>
          </button>

          {!courseForm.is_equivalence && (
            <>
              <div>
                <label className="label">{t('profile.year')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {YEAR_OPTS.map((y) => (
                    <button type="button" key={y} onClick={() => setCourseForm({ ...courseForm, year: y })}
                      className={`py-2 seg ${courseForm.year === y ? 'seg-on' : 'seg-off'}`}>{t('term.year', { year: y })}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">{t('profile.semester')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {TERM_OPTS.map((opt) => (
                      <button type="button" key={opt} onClick={() => setCourseForm({ ...courseForm, term: courseForm.term === opt ? null : opt })}
                        className={`py-2 seg ${courseForm.term === opt ? 'seg-on' : 'seg-off'}`}>{t('grades.termN', { n: opt })}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ECTS</label>
              <input type="number" step="0.5" min="0" max={LIMITS.ects.max} className="input"
                value={courseForm.ects} onChange={(e) => setCourseForm({ ...courseForm, ects: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('grades.professor')}</label>
              <input className="input" placeholder={t('common.optional')} value={courseForm.professor}
                onChange={(e) => setCourseForm({ ...courseForm, professor: e.target.value })} />
            </div>
          </div>
          <ErrorBox error={avisoForm || error} onClose={() => { setAvisoForm(null); clearError() }} />
          <button className="btn-primary w-full mt-2">{courseEditId ? t('common.save') : t('common.add')}</button>
        </form>
      </Modal>

      {/* Catalogo Nova SBE */}
      <CoursePicker open={pickerOpen} onClose={() => setPickerOpen(false)}
        onPick={pickFromCatalog} onManual={openManual} existingCodes={existingCodes} defaultProgram="management" />

      {/* Modal componente */}
      <Modal open={gradeModal} onClose={() => setGradeModal(false)} title={gradeEditId ? t('grades.editComponent') : t('grades.newComponent')}>
        <form onSubmit={saveGrade} className="space-y-3">
          <div>
            <label className="label">{t('schedule.name')}</label>
            <input className="input" required placeholder={t('grades.componentPlaceholder')}
              value={gradeForm.title} onChange={(e) => setGradeForm({ ...gradeForm, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t('grades.weightLabel')}</label>
              <input type="number" step="1" min="0" max="100" className="input" required placeholder="40"
                value={gradeForm.weight} onChange={(e) => setGradeForm({ ...gradeForm, weight: e.target.value })} />
            </div>
            <div>
              <label className="label">{t('grades.gradeLabel')}</label>
              <input type="number" step="0.1" min="0" max="20" className="input" placeholder={t('grades.noGradeYetShort')}
                value={gradeForm.grade} onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-400">{t('grades.componentHint')}</p>
          <ErrorBox error={avisoForm || error} onClose={() => { setAvisoForm(null); clearError() }} />
          <button className="btn-primary w-full mt-2">{gradeEditId ? t('common.save') : t('common.add')}</button>
        </form>
      </Modal>
    </div>
  )
}
