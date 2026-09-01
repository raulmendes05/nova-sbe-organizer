import { useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { supabase } from '../lib/supabase.js'
import { Modal, Icon, Spinner, ErrorBox } from './ui.jsx'
import { flatCatalog } from '../data/curriculum.js'
import { COURSE_COLORS } from '../lib/helpers.js'
import { hasSchedule, turnosFor, blocksFor } from '../lib/enroll.js'
import { errorText } from '../lib/errors.js'
import { useT } from '../i18n/index.jsx'

const DISMISS_KEY = 'coursesPromptDismissed'
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s) => s.toLowerCase().normalize('NFD').replace(DIACRITICS, '')

// A Vercel corta corpos acima de ~4.5 MB e uma captura de telemovel passa
// disso à vontade. Encolher no browser é mais rápido do que falhar no envio.
const MAX_SIDE = 1600
async function encolher(file) {
  const bitmap = await createImageBitmap(file)
  const escala = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
  return { image: dataUrl.split(',')[1], mime: 'image/jpeg' }
}

/**
 * Pop-up de inscricao: aparece a seguir ao onboarding, quando o aluno ainda
 * nao tem cadeiras deste ano/semestre. Duas entradas — a captura do horario do
 * NETPA (rapida) ou a escolha a mao (sempre fiavel). O que a captura devolve e
 * sempre confirmado por ele antes de ir para a base de dados.
 */
export default function CoursesPrompt() {
  const { user, academicYear, semester, program } = useAuth()
  const { rows: courses, loading: coursesLoading, add: addCourse } = useCourses()
  const { t } = useT()

  const ano = Number(academicYear) || null
  const termo = Number(semester) || null
  const jaTemDesteSemestre = courses.some((c) => c.year === ano && c.term === termo)
  const adiado = typeof sessionStorage !== 'undefined'
    && sessionStorage.getItem(DISMISS_KEY) === `${ano}-${termo}`

  const [open, setOpen] = useState(true)
  const [passo, setPasso] = useState('intro')   // intro | ler | escolher | turnos
  const [escolhidas, setEscolhidas] = useState([])   // codigos
  const [turnos, setTurnos] = useState({})           // codigo -> [g]
  const [naoLidas, setNaoLidas] = useState([])
  const [q, setQ] = useState('')
  const [erro, setErro] = useState(null)
  const [guardando, setGuardando] = useState(false)
  // Assim que o aluno mexe, o modal deixa de depender da condicao de entrada:
  // senao uma gravacao que falhasse a meio ja tinha criado cadeiras, a
  // condicao passava a falsa e o modal desaparecia levando o erro com ele.
  const [comecou, setComecou] = useState(false)
  // Numa segunda tentativa depois de falhar a meio, nao repetir as que ja foram.
  const criadas = useRef(new Set())
  const fileRef = useRef(null)

  const catalogo = useMemo(() => flatCatalog(program), [program])
  const porCodigo = useMemo(
    () => Object.fromEntries(catalogo.map((c) => [c.code, c])), [catalogo])

  // As que tem grelha publicada sao as que correm mesmo neste semestre —
  // aparecem primeiro, o resto fica acessivel pela pesquisa.
  const lista = useMemo(() => {
    const query = norm(q.trim())
    const hits = query
      ? catalogo.filter((c) => norm(c.name).includes(query) || c.code.includes(query))
      : catalogo
    return [...hits].sort((a, b) =>
      (hasSchedule(b.code) ? 1 : 0) - (hasSchedule(a.code) ? 1 : 0) || a.name.localeCompare(b.name))
  }, [catalogo, q])

  if (!comecou && (coursesLoading || jaTemDesteSemestre || adiado || !ano || !termo)) return null

  function adiar() {
    try { sessionStorage.setItem(DISMISS_KEY, `${ano}-${termo}`) } catch { /* ignore */ }
    setOpen(false)
  }

  const alterna = (code) => setEscolhidas((prev) =>
    prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code])

  async function lerImagem(file) {
    if (!file) return
    setComecou(true)
    setPasso('ler'); setErro(null)
    try {
      const corpo = await encolher(file)
      const res = await fetch('/api/horario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)

      const lidas = out.cadeiras || []
      setNaoLidas(out.naoReconhecido || [])
      if (!lidas.length) {
        setErro(t('coursesPrompt.readNone'))
        setPasso('escolher')
        return
      }
      setEscolhidas(lidas.map((c) => c.codigo).filter((c) => porCodigo[c]))
      setTurnos(Object.fromEntries(lidas.map((c) => [c.codigo, c.turnos])))
      setPasso('escolher')
    } catch (e) {
      setErro(errorText(e, t))
      setPasso('escolher')
    }
  }

  const escolheTurno = (code, kind, g) => setTurnos((prev) => {
    const daCadeira = prev[code] || []
    const doTipo = new Set(turnosFor(code).find((x) => x.kind === kind)?.turnos.map((x) => x.g))
    // Um turno de cada tipo: escolher outro substitui o anterior.
    const resto = daCadeira.filter((x) => !doTipo.has(x))
    return { ...prev, [code]: daCadeira.includes(g) ? resto : [...resto, g] }
  })

  async function guardar() {
    setGuardando(true); setErro(null)
    try {
      const blocos = []
      for (const [i, code] of escolhidas.entries()) {
        const ficha = porCodigo[code]
        if (!ficha || criadas.current.has(code)) continue
        const criada = await addCourse({
          name: ficha.name,
          code: ficha.code,
          ects: ficha.ects,
          color: COURSE_COLORS[(courses.length + i) % COURSE_COLORS.length],
          year: ano,
          term: termo,
        })
        criadas.current.add(code)
        for (const b of blocksFor(code, ficha.name, turnos[code])) {
          blocos.push({ ...b, course_id: criada.id, user_id: user.id })
        }
      }
      if (blocos.length) {
        const { error } = await supabase.from('schedule_blocks').insert(blocos)
        if (error) throw error
      }
      setOpen(false)
    } catch (e) {
      setErro(errorText(e, t))
    } finally {
      setGuardando(false)
    }
  }

  const comGrelha = escolhidas.filter((c) => hasSchedule(c))
  const titulo = passo === 'turnos' ? t('coursesPrompt.turnosTitle') : t('coursesPrompt.title')

  return (
    <Modal open={open} onClose={adiar} title={titulo}>
      {/* ---------- Entrada: captura do NETPA ou a mao ---------- */}
      {passo === 'intro' && (
        <>
          <p className="text-sm text-slate-300 leading-relaxed">{t('coursesPrompt.body')}</p>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => lerImagem(e.target.files?.[0])} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full mt-4 rounded-2xl bg-nova-500/15 border border-nova-500/30 p-4 text-left flex items-start gap-3 active:scale-[0.99] transition">
            <Icon name="spark" className="w-5 h-5 text-nova-200 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-white">{t('coursesPrompt.upload')}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{t('coursesPrompt.uploadHint')}</span>
            </span>
          </button>
          <button onClick={() => { setComecou(true); setPasso('escolher') }}
            className="w-full mt-2 rounded-2xl bg-white/[0.05] border border-white/10 p-4 text-left flex items-start gap-3 active:scale-[0.99] transition">
            <Icon name="clipboard" className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
            <span>
              <span className="block text-sm font-semibold text-white">{t('coursesPrompt.manual')}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{t('coursesPrompt.manualHint')}</span>
            </span>
          </button>
          <button onClick={adiar} className="w-full text-center text-sm text-slate-400 mt-5 py-2">
            {t('coursesPrompt.later')}
          </button>
        </>
      )}

      {/* ---------- A ler a imagem ---------- */}
      {passo === 'ler' && (
        <div className="py-4">
          <Spinner />
          <p className="text-sm text-slate-400 text-center">{t('coursesPrompt.reading')}</p>
        </div>
      )}

      {/* ---------- Escolher as cadeiras ---------- */}
      {passo === 'escolher' && (
        <>
          <ErrorBox error={erro} onClose={() => setErro(null)} className="mb-3" />
          {naoLidas.length > 0 && (
            <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mb-3">
              {t('coursesPrompt.unmatched', { list: naoLidas.join(', ') })}
            </p>
          )}
          <p className="text-sm text-slate-400 mb-3">{t('coursesPrompt.pickHint')}</p>

          {/* As escolhidas ficam a vista aqui em cima: espalhadas por uma lista
              de 50+ cadeiras, o aluno nao via o que a captura tinha apanhado. */}
          {escolhidas.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {t('coursesPrompt.selected', { n: escolhidas.length })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {escolhidas.map((code) => (
                  <button key={code} type="button" onClick={() => alterna(code)}
                    className="chip bg-nova-500/25 border border-nova-400/40 text-white flex items-center gap-1.5">
                    {porCodigo[code]?.name || code}
                    <Icon name="close" className="w-3 h-3 opacity-70" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <input className="input mb-3" placeholder={t('coursesPrompt.search')}
            value={q} onChange={(e) => setQ(e.target.value)} />

          <div className="space-y-1.5 max-h-[45vh] overflow-y-auto -mx-1 px-1">
            {lista.map((c) => {
              const on = escolhidas.includes(c.code)
              return (
                <button key={c.code} type="button" onClick={() => alterna(c.code)}
                  className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left border transition ${
                    on ? 'bg-nova-500/20 border-nova-500/40' : 'bg-white/[0.04] border-white/10'
                  }`}>
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${
                    on ? 'bg-accent-500 border-accent-500' : 'border-white/30'
                  }`}>
                    {on && <Icon name="check" className="w-3.5 h-3.5 text-white" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-slate-100 truncate">{c.name}</span>
                    <span className="block text-xs text-slate-500">#{c.code} · {c.ects} ECTS</span>
                  </span>
                  {hasSchedule(c.code) && <Icon name="clock" className="w-4 h-4 text-slate-500 shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={adiar} className="btn-ghost flex-1 py-2.5 text-sm">{t('coursesPrompt.later')}</button>
            <button disabled={!escolhidas.length}
              onClick={() => (comGrelha.length ? setPasso('turnos') : guardar())}
              className="btn-primary flex-1 py-2.5 disabled:opacity-50">
              {comGrelha.length ? t('coursesPrompt.next') : t('coursesPrompt.finish')}
            </button>
          </div>
        </>
      )}

      {/* ---------- Escolher os turnos ---------- */}
      {passo === 'turnos' && (
        <>
          <ErrorBox error={erro} onClose={() => setErro(null)} className="mb-3" />
          <p className="text-sm text-slate-400 mb-3">{t('coursesPrompt.turnosHint')}</p>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto -mx-1 px-1">
            {comGrelha.map((code) => (
              <div key={code}>
                <p className="text-sm font-semibold text-slate-200 mb-1.5">{porCodigo[code]?.name}</p>
                {turnosFor(code).map((grupo) => (
                  <div key={grupo.kind} className="mb-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
                      {t(`coursesPrompt.kind${grupo.kind}`)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {grupo.turnos.map((x) => {
                        const on = (turnos[code] || []).includes(x.g)
                        return (
                          <button key={x.g} type="button" onClick={() => escolheTurno(code, grupo.kind, x.g)}
                            title={x.when.map((w) => `${t(`day.${w.d}.short`)} ${w.s}-${w.e}`).join(' · ')}
                            className={`chip border transition ${
                              on ? 'bg-accent-500/25 border-accent-400/50 text-white'
                                 : 'bg-white/[0.05] border-white/10 text-slate-300'
                            }`}>
                            {x.g}{x.term !== 'S1' && <span className="opacity-60"> {x.term}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => setPasso('escolher')} disabled={guardando}
              className="btn-ghost flex-1 py-2.5 text-sm">{t('coursesPrompt.back')}</button>
            <button onClick={guardar} disabled={guardando} className="btn-primary flex-1 py-2.5">
              {guardando ? t('common.saving') : t('coursesPrompt.finish')}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
