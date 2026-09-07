import { useRef, useState } from 'react'
import { Icon, Spinner, ErrorBox } from './ui.jsx'
import CourseSelect from './CourseSelect.jsx'
import { lerPptx, slidesEmTexto, podeLerPptx } from '../lib/pptx.js'
import { errorText } from '../lib/errors.js'
import { useT } from '../i18n/index.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const MAX_PDF = 3.5 * 1024 * 1024   // em base64 isto ja da ~4,7 MB, o limite da Vercel
const ACEITA = '.pptx,.pdf,.txt,.md'

const extensaoDe = (nome) => String(nome || '').toLowerCase().split('.').pop()

// Um PDF vai inteiro para o modelo (ele sabe ler paginas); o resto vira texto
// aqui no browser, que e mais rapido e nao esbarra no limite do corpo.
async function base64De(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
  }
  return btoa(bin)
}

/**
 * Slides -> resumo de estudo.
 *
 * O .pptx e aberto aqui (ver lib/pptx.js): so o texto e que viaja, o que evita
 * mandar 30 MB de imagens para um servidor que corta aos 4,5 — e responde
 * muito mais depressa.
 */
export default function SlideSummary({ onSave, onAddTask, guardando }) {
  const { t } = useT()
  const { lang } = useAuth()
  const [ficheiro, setFicheiro] = useState(null)
  const [aLer, setALer] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [cadeira, setCadeira] = useState(null)
  const [abertos, setAbertos] = useState(() => new Set([0]))
  const [postas, setPostas] = useState(() => new Set())
  const [guardado, setGuardado] = useState(false)
  const fileRef = useRef(null)

  const alterna = (i) => setAbertos((prev) => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  async function resumir(file) {
    if (!file) return
    setErro(null); setResultado(null); setGuardado(false); setPostas(new Set())
    setFicheiro(file)
    const ext = extensaoDe(file.name)
    setALer(true)
    try {
      const corpo = { nome: file.name, lang, cadeira: cadeira || undefined }
      if (ext === 'pptx') {
        if (!podeLerPptx()) throw new Error(t('plan.noPptx'))
        const slides = await lerPptx(file)
        corpo.texto = slidesEmTexto(slides)
        if (corpo.texto.trim().length < 40) throw new Error(t('plan.emptyDeck'))
      } else if (ext === 'pdf') {
        if (file.size > MAX_PDF) throw new Error(t('plan.pdfTooBig'))
        corpo.file = await base64De(file)
        corpo.mime = 'application/pdf'
      } else if (ext === 'txt' || ext === 'md') {
        corpo.texto = await file.text()
      } else {
        throw new Error(t('plan.badType'))
      }

      const res = await fetch('/api/resumo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)
      setResultado(out)
      setAbertos(new Set([0]))
    } catch (e) {
      setErro(errorText(e, t))
    } finally {
      setALer(false)
    }
  }

  async function guardar() {
    await onSave({ nome: resultado.titulo || ficheiro?.name, resumo: resultado, course_id: cadeira })
    setGuardado(true)
  }

  async function porNoPlano(texto, i) {
    await onAddTask(texto, cadeira)
    setPostas((prev) => new Set(prev).add(i))
  }

  return (
    <div className="card p-4">
      <p className="text-sm font-semibold text-slate-200">{t('plan.slidesTitle')}</p>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">{t('plan.slidesHint')}</p>

      <input ref={fileRef} type="file" accept={ACEITA} className="hidden"
        onChange={(e) => { resumir(e.target.files?.[0]); e.target.value = '' }} />

      <div className="mb-3">
        <label className="label">{t('common.course')}</label>
        <CourseSelect value={cadeira} onChange={setCadeira} />
      </div>

      <button onClick={() => fileRef.current?.click()} disabled={aLer}
        className="w-full rounded-2xl bg-nova-500/15 border border-nova-500/30 p-4 text-left flex items-start gap-3 active:scale-[0.99] transition disabled:opacity-60">
        <Icon name="upload" className="w-5 h-5 text-nova-200 shrink-0 mt-0.5" />
        <span>
          <span className="block text-sm font-semibold text-white">{t('plan.pick')}</span>
          <span className="block text-xs text-slate-400 mt-0.5">{t('plan.pickHint')}</span>
        </span>
      </button>

      {aLer && (
        <div className="py-4">
          <Spinner />
          <p className="text-sm text-slate-400 text-center">{t('plan.reading', { nome: ficheiro?.name || '' })}</p>
        </div>
      )}

      <ErrorBox error={erro} onClose={() => setErro(null)} className="mt-3" />

      {resultado && !aLer && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-base font-bold text-white leading-snug">{resultado.titulo}</p>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">{resultado.resumo}</p>
          </div>

          {resultado.topicos?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('plan.topics')}</p>
              {resultado.topicos.map((topico, i) => (
                <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
                  <button onClick={() => alterna(i)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
                    <span className="flex-1 text-sm font-medium text-slate-100">{topico.titulo}</span>
                    <span className={`text-slate-500 transition ${abertos.has(i) ? 'rotate-180' : ''}`}>▾</span>
                  </button>
                  {abertos.has(i) && (
                    <ul className="px-3 pb-3 space-y-1.5">
                      {(topico.pontos || []).map((p, j) => (
                        <li key={j} className="text-sm text-slate-300 leading-relaxed flex gap-2">
                          <span className="text-nova-400 shrink-0">·</span><span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {resultado.termos?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{t('plan.terms')}</p>
              <div className="space-y-1.5">
                {resultado.termos.map((x, i) => (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed">
                    <span className="font-semibold text-slate-100">{x.termo}</span> — {x.definicao}
                  </p>
                ))}
              </div>
            </div>
          )}

          {resultado.perguntas?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{t('plan.questions')}</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                {resultado.perguntas.map((q, i) => (
                  <li key={i} className="text-sm text-slate-300 leading-relaxed">{q}</li>
                ))}
              </ol>
            </div>
          )}

          {/* O passo que fecha o circulo: do resumo para o plano da semana. */}
          {resultado.tarefas?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{t('plan.suggestedTasks')}</p>
              <div className="space-y-1.5">
                {resultado.tarefas.map((tarefa, i) => (
                  <button key={i} onClick={() => porNoPlano(tarefa, i)} disabled={postas.has(i)}
                    className={`w-full flex items-start gap-2 rounded-xl px-3 py-2 text-left border transition ${
                      postas.has(i) ? 'bg-emerald-500/10 border-emerald-500/25' : 'bg-white/[0.04] border-white/10 active:scale-[0.99]'
                    }`}>
                    <Icon name={postas.has(i) ? 'check' : 'plus'}
                      className={`w-4 h-4 shrink-0 mt-0.5 ${postas.has(i) ? 'text-emerald-400' : 'text-nova-300'}`} />
                    <span className="text-sm text-slate-200 flex-1">{tarefa}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={guardar} disabled={guardado || guardando}
            className="btn-primary w-full py-2.5 disabled:opacity-60">
            {guardado ? t('plan.saved') : guardando ? t('common.saving') : t('plan.save')}
          </button>
        </div>
      )}
    </div>
  )
}
