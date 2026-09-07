import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { Icon, Spinner, ErrorBox } from './ui.jsx'
import { encolher } from '../lib/imagem.js'
import { errorText, apiError } from '../lib/errors.js'
import {
  handbookOf, handbookBody, contas, chaveDoExercicio, estadoDoVeredicto,
} from '../lib/exercicios.js'
import { useT } from '../i18n/index.jsx'

const MAX_MB = 20
const MAX_PELA_API = 3 * 1024 * 1024
const CORES = {
  porfazer: 'bg-white/[0.05] border-white/10 text-slate-300',
  feito: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
  errado: 'bg-rose-500/15 border-rose-500/30 text-rose-200',
  duvida: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
}

// O PDF vai direto do browser para o R2 com um URL assinado — não passa pela
// função da Vercel, que corta aos 4,5 MB.
async function assinar(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/exam-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await apiError(res)
  return res.json()
}

// Pelo servidor, quando o envio direto não passa. Limitado pelo corpo que a
// Vercel aceita, por isso é o plano B e não o plano A.
async function pelaApi(file, t) {
  if (file.size > MAX_PELA_API) throw new Error(t('hb.corsBlocked', { n: Math.round(MAX_PELA_API / 1048576) }))
  const bytes = new Uint8Array(await file.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192))
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify({ file: btoa(bin), mime: file.type || 'application/pdf', nome: file.name }),
  })
  if (!res.ok) throw await apiError(res)
  return (await res.json()).path
}

async function paraOR2(file, t) {
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(t('hb.tooBig', { n: MAX_MB }))
  const { url, path } = await assinar({
    action: 'upload', courseCode: 'handbook', fileName: file.name,
    contentType: file.type || 'application/pdf',
  })
  try {
    const put = await fetch(url, {
      method: 'PUT', headers: { 'Content-Type': file.type || 'application/pdf' }, body: file,
    })
    if (!put.ok) throw new Error(t('hb.errUpload', { status: put.status }))
    return path
  } catch (e) {
    // Um PUT para outro domínio que rebenta sem resposta é o browser a bloquear
    // por CORS. O ficheiro pequeno ainda vai pelo servidor; o grande não tem
    // volta a dar sem se autorizar o domínio no bucket.
    const rede = /failed to fetch|networkerror|load failed/i.test(String(e?.message || ''))
    if (!rede) throw e
    return pelaApi(file, t)
  }
}

async function pedir(url, corpo) {
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
  })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`)
  return out
}

/**
 * Enviar um caderno novo e ler-lhe o índice. Vive aqui fora para o botão de
 * "Exercícios" da zona de adicionar poder usar o mesmo caminho.
 */
export async function carregarCaderno(file, { nomeCadeira, lang, t, aoAndar }) {
  aoAndar?.(t('hb.uploading'))
  const path = await paraOR2(file, t)
  aoAndar?.(t('hb.readingIndex'))
  const out = await pedir('/api/exercicios', { path, cadeira: nomeCadeira || undefined, lang })
  if (!out.capitulos?.length) throw new Error(t('hb.noChapters'))
  return {
    nome: file.name, pdf: path, solucoes: null,
    capitulos: out.capitulos.map((c) => ({ ...c, exercicios: null })),
    estado: {},
  }
}

/**
 * O caderno de exercícios de uma cadeira: que exercícios existem, quais estão
 * feitos, e a correção de cada um.
 *
 * O índice do PDF é lido em dois tempos — primeiro os capítulos, e o conteúdo
 * de cada um só quando o aluno o abre. Um caderno de 200 páginas lido de uma
 * vez leva minutos; assim ninguém espera por aquilo que não vai ver.
 */
export default function Handbook({ linha, cadeira, nomeCadeira, onGuardar, onApagar }) {
  const { t } = useT()
  const { lang } = useAuth()
  const dados = linha ? handbookOf(linha) : null
  const [ocupado, setOcupado] = useState(null)   // texto do que está a acontecer
  const [erro, setErro] = useState(null)
  const [capAberto, setCapAberto] = useState(null)
  const [exAberto, setExAberto] = useState(null) // "iCap:n"
  const [correcao, setCorrecao] = useState(null) // { chave, ...resposta }
  const [lote, setLote] = useState(null)         // correções de fotos à solta
  const soltasRef = useRef(null)
  const pdfRef = useRef(null)
  const solRef = useRef(null)
  const fotoRef = useRef(null)

  const numeros = dados ? contas(dados) : null

  async function guardar(novos) {
    await onGuardar(handbookBody(novos), novos.nome)
  }

  // ---- carregar o caderno ----
  async function novoCaderno(file) {
    if (!file) return
    setErro(null); setOcupado(t('hb.uploading'))
    try {
      const path = await paraOR2(file, t)
      setOcupado(t('hb.readingIndex'))
      const out = await pedir('/api/exercicios', { path, cadeira: nomeCadeira || undefined, lang })
      if (!out.capitulos?.length) throw new Error(t('hb.noChapters'))
      await guardar({
        nome: file.name, pdf: path, solucoes: dados?.solucoes || null,
        capitulos: out.capitulos.map((c) => ({ ...c, exercicios: null })),
        estado: dados?.estado || {},
      })
    } catch (e) {
      setErro(errorText(e, t))
    } finally { setOcupado(null) }
  }

  async function juntarSolucoes(file) {
    if (!file || !dados) return
    setErro(null); setOcupado(t('hb.uploading'))
    try {
      const path = await paraOR2(file, t)
      await guardar({ ...dados, solucoes: path, nomeSolucoes: file.name })
    } catch (e) {
      setErro(errorText(e, t))
    } finally { setOcupado(null) }
  }

  // ---- abrir um capítulo (e lê-lo, à primeira vez) ----
  async function abrirCapitulo(i) {
    if (capAberto === i) { setCapAberto(null); return }
    setCapAberto(i); setExAberto(null); setCorrecao(null)
    const cap = dados.capitulos[i]
    if (cap.exercicios) return
    setErro(null); setOcupado(t('hb.readingChapter', { o: cap.titulo }))
    try {
      const out = await pedir('/api/exercicios', {
        path: dados.pdf, cadeira: nomeCadeira || undefined, lang,
        modo: 'capitulo', capitulo: { titulo: cap.titulo, inicio: cap.inicio, fim: cap.fim },
      })
      const capitulos = dados.capitulos.map((c, j) => (j === i ? { ...c, exercicios: out.exercicios || [] } : c))
      await guardar({ ...dados, capitulos })
    } catch (e) {
      setErro(errorText(e, t))
    } finally { setOcupado(null) }
  }

  // ---- o enunciado, quando o capítulo foi lido antes de os guardarmos ----
  async function irBuscarEnunciado(iCap, ex) {
    const cap = dados.capitulos[iCap]
    setErro(null); setOcupado(t('hb.readingStatement', { n: ex.n }))
    try {
      const out = await pedir('/api/exercicios', {
        path: dados.pdf, cadeira: nomeCadeira || undefined, lang,
        modo: 'enunciado', n: ex.n,
        capitulo: { titulo: cap.titulo, inicio: cap.inicio, fim: cap.fim },
      })
      if (!out.enunciado) throw new Error(t('hb.noStatement'))
      const capitulos = dados.capitulos.map((c, j) => (j !== iCap ? c : {
        ...c, exercicios: c.exercicios.map((e) => (e.n === ex.n ? { ...e, enunciado: out.enunciado } : e)),
      }))
      await guardar({ ...dados, capitulos })
    } catch (e) {
      setErro(errorText(e, t))
    } finally { setOcupado(null) }
  }

  // ---- fotos à solta: é a app que descobre de que exercício são ----
  const indiceTodo = () => dados.capitulos.flatMap((c, i) =>
    (c.exercicios || []).map((e) => ({ ...e, iCap: i })))

  async function corrigirSoltas(lista) {
    const fotos = [...(lista || [])].slice(0, 6)
    if (!fotos.length) return
    const indice = indiceTodo()
    if (!indice.length) { setErro(t('hb.readChapterFirst')); return }
    setErro(null); setLote([]); setCorrecao(null)
    const resultados = []
    let estadoNovo = { ...dados.estado }
    try {
      for (const [i, f] of fotos.entries()) {
        setOcupado(t('hb.gradingN', { n: i + 1, total: fotos.length }))
        const { image } = await encolher(f)
        const out = await pedir('/api/corrigir', {
          imagens: [image], mime: 'image/jpeg',
          indice: indice.map(({ n, assunto, enunciado }) => ({ n, assunto, enunciado })),
          capitulo: dados.capitulos.map((c) => c.titulo).join(' · '),
          solucoesPath: dados.solucoes || undefined,
          cadeira: nomeCadeira || undefined, lang,
        })
        const achado = out.n ? indice.find((e) => String(e.n) === String(out.n)) : null
        resultados.push({ ...out, ex: achado || null })
        setLote([...resultados])
        if (achado) {
          estadoNovo = {
            ...estadoNovo,
            [chaveDoExercicio(achado.iCap, achado.n)]: {
              estado: estadoDoVeredicto(out.veredicto), nota: out.nota, veredicto: out.veredicto,
              feedback: out.feedback, quando: new Date().toISOString().slice(0, 10),
            },
          }
        }
      }
      await guardar({ ...dados, estado: estadoNovo })
    } catch (e) {
      setErro(errorText(e, t))
    } finally { setOcupado(null) }
  }

  // ---- estado de um exercício ----
  async function marcar(iCap, n, estado) {
    const chave = chaveDoExercicio(iCap, n)
    const antigo = dados.estado[chave] || {}
    await guardar({ ...dados, estado: { ...dados.estado, [chave]: { ...antigo, estado } } })
  }

  // ---- corrigir uma fotografia ----
  async function corrigir(lista, iCap, ex) {
    const fotos = [...(lista || [])].slice(0, 4)
    if (!fotos.length) return
    const chave = chaveDoExercicio(iCap, ex.n)
    setErro(null); setCorrecao(null); setOcupado(t('hb.grading'))
    try {
      const encolhidas = []
      for (const f of fotos) encolhidas.push(await encolher(f))
      const cap = dados.capitulos[iCap]
      const out = await pedir('/api/corrigir', {
        imagens: encolhidas.map((x) => x.image), mime: 'image/jpeg',
        exercicio: `${ex.n} — ${ex.assunto}`,
        capitulo: cap.titulo,
        paginas: cap.inicio ? `${cap.inicio}-${cap.fim || cap.inicio}` : undefined,
        solucoesPath: dados.solucoes || undefined,
        cadeira: nomeCadeira || undefined, lang,
      })
      setCorrecao({ chave, ...out })
      await guardar({
        ...dados,
        estado: {
          ...dados.estado,
          [chave]: {
            estado: estadoDoVeredicto(out.veredicto), nota: out.nota,
            veredicto: out.veredicto, feedback: out.feedback,
            quando: new Date().toISOString().slice(0, 10),
          },
        },
      })
    } catch (e) {
      setErro(errorText(e, t))
    } finally { setOcupado(null) }
  }

  // O envio de um caderno novo vive na zona de acrescentar do Caderno; aqui
  // chega sempre uma linha já criada.
  if (!dados) return null

  // ---------- com caderno ----------
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200 truncate">{dados.nome}</p>
          <p className="text-xs text-slate-500">
            {t('hb.progress', { n: numeros.feitos, total: numeros.total })}
            {numeros.porLer > 0 ? ` · ${t('hb.unread', { n: numeros.porLer })}` : ''}
          </p>
        </div>
        <button onClick={onApagar} aria-label={t('common.delete')}
          className="p-1 text-slate-500 hover:text-rose-400 shrink-0">
          <Icon name="trash" className="w-4 h-4" />
        </button>
      </div>

      {numeros.total > 0 && (
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-2">
          <div className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${(numeros.feitos / numeros.total) * 100}%` }} />
        </div>
      )}

      {/* As soluções são opcionais — sem elas corrige-se na mesma, e diz-se. */}
      <input ref={solRef} type="file" accept="application/pdf,.pdf" className="hidden"
        onChange={(e) => { juntarSolucoes(e.target.files?.[0]); e.target.value = '' }} />
      {dados.solucoes ? (
        <p className="text-[11px] text-emerald-300/80 mt-2">{t('hb.hasSolutions')}</p>
      ) : (
        <button onClick={() => solRef.current?.click()} disabled={Boolean(ocupado)}
          className="text-xs text-nova-300 mt-2">{t('hb.addSolutions')}</button>
      )}

      {/* Fotos à solta: várias resoluções de uma vez, sem dizer de que
          exercício são — a app descobre pelo enunciado. */}
      <input ref={soltasRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { corrigirSoltas(e.target.files); e.target.value = '' }} />
      <button onClick={() => soltasRef.current?.click()} disabled={Boolean(ocupado)}
        className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-nova-100 bg-nova-500/15 border border-nova-500/30 flex items-center justify-center gap-2 disabled:opacity-60">
        <Icon name="camera" className="w-4 h-4" /> {t('hb.loose')}
      </button>
      <p className="text-[11px] text-slate-500 mt-1">{t('hb.looseHint')}</p>

      {ocupado && <div className="mt-3"><Spinner /><p className="text-sm text-slate-400 text-center">{ocupado}</p></div>}
      <ErrorBox error={erro} onClose={() => setErro(null)} className="mt-3" />

      {/* O que saiu das fotos à solta */}
      {lote?.length > 0 && !ocupado && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('hb.looseDone')}</p>
            <button onClick={() => setLote(null)} className="text-xs text-slate-400">{t('common.close')}</button>
          </div>
          {lote.map((r, i) => (
            <div key={i} className={`rounded-xl p-3 border ${r.ex ? CORES[estadoDoVeredicto(r.veredicto)] : 'bg-white/[0.04] border-white/10 text-slate-300'}`}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">
                  {r.ex ? t('hb.exercise', { n: r.ex.n }) : t('hb.notRecognised')}
                </p>
                {r.ex && <p className="text-base font-bold tabular-nums">{r.nota}<span className="text-xs opacity-60">/20</span></p>}
              </div>
              <p className="text-sm mt-1 leading-relaxed opacity-90">{r.feedback}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5 mt-3">
        {dados.capitulos.map((cap, i) => (
          <div key={i} className="rounded-xl bg-white/[0.04] border border-white/10 overflow-hidden">
            <button onClick={() => abrirCapitulo(i)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-slate-100 truncate">{cap.titulo}</span>
                <span className="block text-[11px] text-slate-500">
                  {cap.exercicios
                    ? t('hb.exCount', { n: cap.exercicios.length })
                    : t('hb.notRead')}
                </span>
              </span>
              <span className={`text-slate-500 transition ${capAberto === i ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {capAberto === i && cap.exercicios && (
              <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {cap.exercicios.map((ex) => {
                    const chave = chaveDoExercicio(i, ex.n)
                    const st = dados.estado[chave]?.estado || 'porfazer'
                    return (
                      <button key={ex.n} onClick={() => { setExAberto(exAberto === chave ? null : chave); setCorrecao(null) }}
                        className={`chip border tabular-nums ${CORES[st]} ${exAberto === chave ? 'ring-1 ring-white/40' : ''}`}>
                        {ex.n}
                      </button>
                    )
                  })}
                </div>

                {/* O exercício aberto */}
                {cap.exercicios.filter((ex) => chaveDoExercicio(i, ex.n) === exAberto).map((ex) => {
                  const chave = chaveDoExercicio(i, ex.n)
                  const guardado = dados.estado[chave] || {}
                  const c = correcao?.chave === chave ? correcao : null
                  return (
                    <div key={ex.n} className="mt-3 rounded-xl bg-white/[0.04] border border-white/10 p-3">
                      <p className="text-sm font-semibold text-slate-100">{t('hb.exercise', { n: ex.n })}</p>
                      {ex.enunciado ? (
                        <div className="mt-1.5 space-y-1">
                          {ex.enunciado.split('\n').filter((l) => l.trim()).map((l, k) => (
                            <p key={k} className={`text-sm leading-relaxed ${
                              /^\s*[a-z][)\.]/i.test(l) ? 'text-slate-300 pl-3' : 'text-slate-200'
                            }`}>{l.trim()}</p>
                          ))}
                        </div>
                      ) : (<>
                        <p className="text-sm text-slate-300 leading-relaxed mt-0.5">{ex.assunto}</p>
                        <button onClick={() => irBuscarEnunciado(i, ex)} disabled={Boolean(ocupado)}
                          className="mt-1.5 text-xs text-nova-300 flex items-center gap-1.5 disabled:opacity-60">
                          <Icon name="search" className="w-3.5 h-3.5" /> {t('hb.showStatement')}
                        </button>
                      </>)}

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {['porfazer', 'feito', 'duvida', 'errado'].map((s) => (
                          <button key={s} onClick={() => marcar(i, ex.n, s)}
                            className={`chip border ${guardado.estado === s || (!guardado.estado && s === 'porfazer')
                              ? CORES[s] : 'bg-white/[0.03] border-white/10 text-slate-400'}`}>
                            {t(`hb.state.${s}`)}
                          </button>
                        ))}
                      </div>

                      <input ref={fotoRef} type="file" accept="image/*" multiple className="hidden"
                        onChange={(e) => { corrigir(e.target.files, i, ex); e.target.value = '' }} />
                      <button onClick={() => fotoRef.current?.click()} disabled={Boolean(ocupado)}
                        className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-nova-100 bg-nova-500/15 border border-nova-500/30 flex items-center justify-center gap-2 disabled:opacity-60">
                        <Icon name="camera" className="w-4 h-4" /> {t('hb.grade')}
                      </button>

                      {/* A correção: a desta sessão, ou a que ficou guardada */}
                      {(c || guardado.feedback) && (
                        <div className={`mt-3 rounded-xl p-3 border ${CORES[estadoDoVeredicto(c?.veredicto || guardado.veredicto)]}`}>
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold">{t(`hb.verdict.${c?.veredicto || guardado.veredicto}`)}</p>
                            <p className="text-lg font-bold tabular-nums">
                              {(c?.nota ?? guardado.nota)?.toFixed?.(0) ?? c?.nota ?? guardado.nota}
                              <span className="text-xs opacity-60">/20</span>
                            </p>
                          </div>
                          <p className="text-sm mt-1.5 leading-relaxed opacity-90">{c?.feedback || guardado.feedback}</p>
                          {c?.erros?.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {c.erros.map((x, k) => (
                                <li key={k} className="text-xs opacity-90 leading-relaxed">
                                  <span className="font-semibold">{x.onde}</span> — {x.porque}
                                </li>
                              ))}
                            </ul>
                          )}
                          {c?.solucao && (
                            <p className="text-xs mt-2 opacity-80 leading-relaxed whitespace-pre-wrap">
                              <span className="font-semibold">{t('hb.solution')}</span> {c.solucao}
                            </p>
                          )}
                          {c && !c.comSolucoes && (
                            <p className="text-[11px] mt-2 opacity-70">{t('hb.noOfficial')}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
