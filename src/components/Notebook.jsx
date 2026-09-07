import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon, Spinner, ErrorBox } from './ui.jsx'
import SlideSummary from './SlideSummary.jsx'
import { encolher } from '../lib/imagem.js'
import { errorText } from '../lib/errors.js'
import { localeOf } from '../lib/helpers.js'
import { noteOf, isNoteRow, summaryOf, notebookOf } from '../lib/plan.js'
import { useT } from '../i18n/index.jsx'

const MAX_FOTOS = 6

/**
 * O texto dos apontamentos vem com "## " nas seccoes e "- " nas listas — e o
 * que o modelo devolve e o que o aluno continua a escrever a mao no editor.
 * Um markdown inteiro nao se justifica aqui: sao duas regras.
 */
function Texto({ children }) {
  const linhas = String(children || '').split('\n')
  return (
    <div className="space-y-1.5">
      {linhas.map((linha, i) => {
        const l = linha.trim()
        if (!l) return null
        if (l.startsWith('## ')) {
          return <p key={i} className="text-sm font-semibold text-slate-100 pt-1">{l.slice(3)}</p>
        }
        if (l.startsWith('- ') || /^\d+[.)]\s/.test(l)) {
          return (
            <p key={i} className="text-sm text-slate-300 leading-relaxed flex gap-2">
              <span className="text-nova-400 shrink-0">·</span>
              <span>{l.replace(/^-\s/, '')}</span>
            </p>
          )
        }
        return <p key={i} className="text-sm text-slate-300 leading-relaxed">{l}</p>
      })}
    </div>
  )
}

/**
 * O caderno de uma cadeira: os resumos dos slides e os apontamentos do aluno,
 * no mesmo sitio e pela ordem em que foram feitos.
 *
 * Os apontamentos entram de tres maneiras — fotografados (a foto e transcrita
 * e a foto NAO fica guardada, so o texto), escritos a mao, ou vindos de um
 * PowerPoint.
 */
export default function Notebook({
  rows, courses, cadeira, onEscolherCadeira,
  onGuardarNota, onEditarNota, onApagar, onGuardarResumo, onAddTask, guardando,
}) {
  const { t } = useT()
  const { lang } = useAuth()
  const [modo, setModo] = useState(null)        // null | 'foto' | 'escrever' | 'slides'
  const [aLer, setALer] = useState(false)
  const [erro, setErro] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [paginas, setPaginas] = useState(0)
  const [editando, setEditando] = useState(null)  // id da nota em edicao
  const [aberto, setAberto] = useState(null)
  const fotosRef = useRef(null)

  const nomeCadeira = courses.find((c) => c.id === cadeira)?.name || null
  const itens = notebookOf(rows, cadeira)
  const courseById = Object.fromEntries(courses.map((c) => [c.id, c]))

  function limpar() {
    setModo(null); setTitulo(''); setTexto(''); setPaginas(0); setEditando(null); setErro(null)
  }

  async function lerFotos(lista) {
    const fotos = [...(lista || [])].slice(0, MAX_FOTOS)
    if (!fotos.length) return
    setErro(null); setALer(true); setModo('foto')
    try {
      const encolhidas = []
      for (const f of fotos) encolhidas.push(await encolher(f))
      const res = await fetch('/api/apontamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagens: encolhidas.map((x) => x.image),
          mime: 'image/jpeg',
          cadeira: nomeCadeira || undefined,
          lang,
        }),
      })
      const out = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)
      setTitulo(out.titulo || '')
      setTexto(out.texto || '')
      setPaginas(out.paginas || fotos.length)
      setModo('escrever')
    } catch (e) {
      setErro(errorText(e, t))
      setModo(null)
    } finally {
      setALer(false)
    }
  }

  async function guardar() {
    const nome = titulo.trim() || t('note.untitled')
    if (!texto.trim()) return
    if (editando) await onEditarNota(editando, nome, texto.trim())
    else await onGuardarNota(nome, texto.trim(), cadeira)
    limpar()
  }

  function editar(n) {
    const { titulo: tt, texto: tx } = noteOf(n)
    setEditando(n.id); setTitulo(n.title || tt); setTexto(tx); setPaginas(0); setModo('escrever')
  }

  return (
    <div className="space-y-4">
      {/* ---------- De que cadeira ---------- */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">{t('note.whichCourse')}</p>
        <div className="flex flex-wrap gap-1.5">
          {courses.map((c) => (
            <button key={c.id} type="button" onClick={() => { onEscolherCadeira(c.id); limpar() }}
              className={`chip border flex items-center gap-1.5 ${
                cadeira === c.id ? 'bg-nova-500/25 border-nova-400/40 text-white' : 'bg-white/[0.05] border-white/10 text-slate-300'
              }`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color || '#3d78bf' }} />
              {c.name}
            </button>
          ))}
          <button type="button" onClick={() => { onEscolherCadeira(null); limpar() }}
            className={`chip border ${
              cadeira === null ? 'bg-nova-500/25 border-nova-400/40 text-white' : 'bg-white/[0.05] border-white/10 text-slate-300'
            }`}>
            {t('plan.noCourse')}
          </button>
        </div>
      </div>

      <ErrorBox error={erro} onClose={() => setErro(null)} />

      {/* ---------- Como acrescentar ---------- */}
      {!modo && (
        <div className="grid grid-cols-3 gap-2">
          <input ref={fotosRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { lerFotos(e.target.files); e.target.value = '' }} />
          <button onClick={() => fotosRef.current?.click()}
            className="card p-3 flex flex-col items-center gap-1.5 text-center active:scale-[0.98] transition">
            <span className="w-9 h-9 rounded-xl bg-nova-500/15 text-nova-200 flex items-center justify-center">
              <Icon name="camera" className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-slate-200 leading-tight">{t('note.photo')}</span>
          </button>
          <button onClick={() => { limpar(); setModo('escrever') }}
            className="card p-3 flex flex-col items-center gap-1.5 text-center active:scale-[0.98] transition">
            <span className="w-9 h-9 rounded-xl bg-white/[0.06] text-slate-300 flex items-center justify-center">
              <Icon name="edit" className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-slate-200 leading-tight">{t('note.write')}</span>
          </button>
          <button onClick={() => setModo('slides')}
            className="card p-3 flex flex-col items-center gap-1.5 text-center active:scale-[0.98] transition">
            <span className="w-9 h-9 rounded-xl bg-white/[0.06] text-slate-300 flex items-center justify-center">
              <Icon name="upload" className="w-5 h-5" />
            </span>
            <span className="text-xs font-semibold text-slate-200 leading-tight">{t('note.slides')}</span>
          </button>
        </div>
      )}

      {aLer && (
        <div className="card p-4">
          <Spinner />
          <p className="text-sm text-slate-400 text-center">{t('note.reading')}</p>
          <p className="text-xs text-slate-500 text-center mt-1">{t('note.readingHint')}</p>
        </div>
      )}

      {/* ---------- Escrever / corrigir ---------- */}
      {modo === 'escrever' && !aLer && (
        <div className="card p-4 space-y-3">
          {paginas > 0 && (
            <p className="text-xs text-amber-200/80">{t('note.checkTranscript', { n: paginas })}</p>
          )}
          <div>
            <label className="label">{t('note.title')}</label>
            <input className="input" autoFocus={!paginas} placeholder={t('note.titlePlaceholder')}
              value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <label className="label">{t('note.body')}</label>
            <textarea className="input min-h-[220px] leading-relaxed" rows={10}
              placeholder={t('note.bodyPlaceholder')}
              value={texto} onChange={(e) => setTexto(e.target.value)} />
            <p className="text-[11px] text-slate-500 mt-1">{t('note.formatHint')}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={limpar} className="btn-ghost flex-1 py-2.5 text-sm">{t('common.cancel')}</button>
            <button onClick={guardar} disabled={!texto.trim() || guardando}
              className="btn-primary flex-1 py-2.5 disabled:opacity-60">
              {guardando ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      )}

      {/* ---------- Slides ---------- */}
      {modo === 'slides' && (
        <div className="space-y-2">
          <SlideSummary cadeira={cadeira} nomeCadeira={nomeCadeira} guardando={guardando}
            onSave={async (v) => { await onGuardarResumo(v); setModo(null) }}
            onAddTask={onAddTask} />
          <button onClick={limpar} className="btn-ghost w-full py-2.5 text-sm">{t('common.cancel')}</button>
        </div>
      )}

      {/* ---------- O caderno ---------- */}
      {itens.length === 0 ? (
        !modo && <p className="text-sm text-slate-500 py-2">{t('note.empty')}</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('note.count', { n: itens.length })}
          </p>
          {itens.map((n) => {
            const nota = isNoteRow(n)
            const { texto: corpo } = nota ? noteOf(n) : { texto: '' }
            const dados = nota ? null : (() => {
              try { return JSON.parse(summaryOf(n).texto) } catch { return null }
            })()
            const estaAberto = aberto === n.id
            const c = n.course_id ? courseById[n.course_id] : null
            return (
              <div key={n.id} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    nota ? 'bg-white/[0.06] text-slate-300' : 'bg-nova-500/15 text-nova-200'
                  }`}>
                    <Icon name={nota ? 'note' : 'chart'} className="w-4 h-4" />
                  </span>
                  <button onClick={() => setAberto(estaAberto ? null : n.id)} className="flex-1 min-w-0 text-left">
                    <span className="block text-sm font-medium text-slate-100 truncate">{n.title}</span>
                    <span className="block text-[11px] text-slate-500">
                      {t(nota ? 'note.kindNote' : 'note.kindSummary')}
                      {c ? ` · ${c.name}` : ''}
                      {' · '}
                      {new Date(n.created_at).toLocaleDateString(localeOf(lang), { day: 'numeric', month: 'short' })}
                    </span>
                  </button>
                  {nota && (
                    <button onClick={() => editar(n)} aria-label={t('common.edit')}
                      className="p-1 text-slate-500 hover:text-white shrink-0">
                      <Icon name="edit" className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => onApagar(n.id)} aria-label={t('common.delete')}
                    className="p-1 text-slate-500 hover:text-rose-400 shrink-0">
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                </div>

                {estaAberto && (
                  <div className="px-3 pb-3 pt-2.5 border-t border-white/10">
                    {nota ? <Texto>{corpo}</Texto> : dados ? (
                      <div className="space-y-2.5">
                        <p className="text-sm text-slate-300 leading-relaxed">{dados.resumo}</p>
                        {(dados.topicos || []).map((topico, i) => (
                          <div key={i}>
                            <p className="text-sm font-semibold text-slate-100">{topico.titulo}</p>
                            <Texto>{(topico.pontos || []).map((p) => `- ${p}`).join('\n')}</Texto>
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
                                <button key={i} onClick={() => onAddTask(tarefa, n.course_id)} disabled={guardando}
                                  className="w-full flex items-start gap-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-left active:scale-[0.99] transition">
                                  <Icon name="plus" className="w-4 h-4 text-nova-300 shrink-0 mt-0.5" />
                                  <span className="text-sm text-slate-200 flex-1">{tarefa}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">{t('note.broken')}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
