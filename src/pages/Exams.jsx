import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { PageHeader, Fab, Modal, Icon, EmptyState, Spinner } from '../components/ui.jsx'
import { PROGRAMS, flatCatalog } from '../data/curriculum.js'

const MAX_MB = 20

// Os ficheiros vivem no Cloudflare R2; o servidor devolve URLs assinados
// de curta duração para que as chaves nunca cheguem ao browser.
async function signUrl(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/exam-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
    },
    body: JSON.stringify(body),
  })
  const out = await res.json()
  if (!res.ok) throw new Error(out.error || 'Erro no servidor.')
  return out
}

const KINDS = [
  { v: 'exame', label: 'Exame', tone: 'bg-nova-500/20 text-nova-200' },
  { v: 'teste', label: 'Teste / Midterm', tone: 'bg-violet-500/20 text-violet-200' },
  { v: 'recurso', label: 'Recurso', tone: 'bg-amber-500/20 text-amber-200' },
  { v: 'outro', label: 'Outro', tone: 'bg-slate-500/20 text-slate-300' },
]
const kindOf = (v) => KINDS.find((k) => k.v === v) || KINDS[3]

// Catálogo dos dois cursos, sem códigos repetidos
const CATALOG = (() => {
  const map = new Map()
  for (const key of Object.keys(PROGRAMS)) {
    for (const c of flatCatalog(key)) if (!map.has(c.code)) map.set(c.code, c)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})()

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(DIACRITICS, '')

// Anos letivos para o seletor: do atual para trás
const SCHOOL_YEARS = (() => {
  const now = new Date()
  const start = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return Array.from({ length: 8 }, (_, i) => {
    const y = start - i
    return `${y}/${String(y + 1).slice(2)}`
  })
})()

function prettySize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Exams() {
  const { user, displayName } = useAuth()
  const myCourses = useCourses().rows

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [open, setOpen] = useState(() => new Set())
  const [busy, setBusy] = useState(null)      // storage_path a ser descarregado/apagado
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('exam_files')
      .select('*')
      .order('school_year', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else { setRows(data ?? []); setError(null) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Códigos das cadeiras do próprio aluno (para o filtro "As minhas")
  const myCodes = useMemo(
    () => new Set(myCourses.map((c) => c.code).filter(Boolean).map(String)),
    [myCourses]
  )

  // Agrupar por cadeira, já filtrado
  const groups = useMemo(() => {
    const query = norm(q.trim())
    const map = new Map()
    for (const r of rows) {
      if (onlyMine && !myCodes.has(String(r.course_code))) continue
      if (query && !norm(r.course_name).includes(query)
        && !String(r.course_code).includes(query)
        && !norm(r.title).includes(query)) continue
      const g = map.get(r.course_code)
      if (g) g.files.push(r)
      else map.set(r.course_code, { code: r.course_code, name: r.course_name, files: [r] })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [rows, q, onlyMine, myCodes])

  const total = rows.length

  function toggle(code) {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(code) ? next.delete(code) : next.add(code)
      return next
    })
  }

  async function download(row) {
    setBusy(row.storage_path)
    try {
      const ext = row.storage_path.split('.').pop()
      const name = [row.course_code, kindOf(row.kind).label.split(' ')[0], row.school_year || '']
        .filter(Boolean).join(' ').replace(/\//g, '-')
      const { url } = await signUrl({
        action: 'download', path: row.storage_path, downloadAs: `${name}.${ext}`,
      })
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setError(e.message || 'Não consegui abrir o ficheiro.')
    } finally {
      setBusy(null)
    }
  }

  async function removeFile(row) {
    if (!window.confirm('Apagar este ficheiro da biblioteca?')) return
    setBusy(row.storage_path)
    try {
      // O servidor apaga a linha (a RLS confirma que é tua) e só depois o ficheiro.
      await signUrl({ action: 'delete', path: row.storage_path })
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (e) {
      setError(e.message || 'Não consegui apagar.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="pb-24">
      <PageHeader
        title="Provas antigas"
        subtitle={total ? `${total} ficheiro${total === 1 ? '' : 's'} partilhado${total === 1 ? '' : 's'}` : 'Exames e testes de anos anteriores'}
      />

      <input className="input mb-2" placeholder="Pesquisar cadeira ou código..."
        value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button type="button" onClick={() => setOnlyMine(false)}
          className={`py-2 seg ${!onlyMine ? 'seg-on' : 'seg-off'}`}>Todas</button>
        <button type="button" onClick={() => setOnlyMine(true)}
          className={`py-2 seg ${onlyMine ? 'seg-on' : 'seg-off'}`}>As minhas cadeiras</button>
      </div>

      {error && (
        <div className="card p-3 mb-3 text-sm text-rose-200 bg-rose-500/10 border-rose-500/20 flex items-start gap-2">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-rose-300"><Icon name="close" className="w-4 h-4" /></button>
        </div>
      )}

      {loading ? <Spinner /> : groups.length === 0 ? (
        <EmptyState icon="archive"
          title={total === 0 ? 'A biblioteca está vazia' : 'Sem resultados'}
          hint={total === 0
            ? 'Sê o primeiro a partilhar: carrega no + e envia exames ou testes antigos.'
            : 'Tenta outra pesquisa ou desliga o filtro "As minhas cadeiras".'} />
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const isOpen = open.has(g.code) || Boolean(q.trim())
            return (
              <div key={g.code} className="card overflow-hidden">
                <button type="button" onClick={() => toggle(g.code)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition">
                  <span className="w-9 h-9 rounded-xl bg-nova-500/15 text-nova-300 flex items-center justify-center shrink-0">
                    <Icon name="archive" className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-100 truncate">{g.name}</span>
                    <span className="block text-xs text-slate-500">
                      #{g.code} · {g.files.length} ficheiro{g.files.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <Icon name="chevron"
                    className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>

                {isOpen && (
                  <div className="border-t border-white/5 divide-y divide-white/5">
                    {g.files.map((f) => {
                      const k = kindOf(f.kind)
                      const working = busy === f.storage_path
                      return (
                        <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-1.5 flex-wrap">
                              <span className={`chip ${k.tone}`}>{k.label}</span>
                              {f.school_year && <span className="text-xs font-medium text-slate-300">{f.school_year}</span>}
                              {f.has_solutions && (
                                <span className="chip bg-emerald-500/20 text-emerald-200">c/ resolução</span>
                              )}
                            </span>
                            {f.title && <span className="block text-xs text-slate-400 mt-1 truncate">{f.title}</span>}
                            <span className="block text-[11px] text-slate-600 mt-0.5">
                              {prettySize(f.file_size)}{f.uploader_name ? ` · ${f.uploader_name}` : ''}
                            </span>
                          </span>

                          <button onClick={() => download(f)} disabled={working} aria-label="Descarregar"
                            className="p-2 rounded-lg text-nova-300 hover:bg-white/10 disabled:opacity-40 shrink-0">
                            <Icon name="download" className="w-5 h-5" />
                          </button>
                          {f.uploaded_by === user?.id && (
                            <button onClick={() => removeFile(f)} disabled={working} aria-label="Apagar"
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-white/10 disabled:opacity-40 shrink-0">
                              <Icon name="trash" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Fab onClick={() => setModal(true)} label="Enviar exame" />

      <UploadModal
        open={modal}
        onClose={() => setModal(false)}
        user={user}
        displayName={displayName}
        myCodes={myCodes}
        onDone={load}
      />
    </div>
  )
}

/* ---------- Modal de envio (aceita vários ficheiros de uma vez) ---------- */
function UploadModal({ open, onClose, user, displayName, myCodes, onDone }) {
  const [course, setCourse] = useState(null)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('exame')
  const [year, setYear] = useState(SCHOOL_YEARS[0])
  const [solutions, setSolutions] = useState(false)
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [err, setErr] = useState(null)

  function reset() {
    setCourse(null); setQ(''); setKind('exame'); setYear(SCHOOL_YEARS[0])
    setSolutions(false); setFiles([]); setErr(null); setProgress('')
  }

  function close() { if (!saving) { reset(); onClose() } }

  // Cadeiras do aluno primeiro — é o que ele mais provavelmente vai enviar
  const list = useMemo(() => {
    const query = norm(q.trim())
    const hits = query
      ? CATALOG.filter((c) => norm(c.name).includes(query) || c.code.includes(query))
      : CATALOG
    return [...hits].sort((a, b) => {
      const am = myCodes.has(a.code) ? 0 : 1
      const bm = myCodes.has(b.code) ? 0 : 1
      return am - bm || a.name.localeCompare(b.name)
    })
  }, [q, myCodes])

  async function submit() {
    if (!course || !files.length) return
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024)
    if (tooBig) { setErr(`"${tooBig.name}" tem mais de ${MAX_MB} MB.`); return }

    setSaving(true); setErr(null)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(`A enviar ${i + 1} de ${files.length}...`)
        // 1) pedir ao servidor um URL de escrita; ele é que decide o caminho
        const { url, path } = await signUrl({
          action: 'upload',
          courseCode: course.code,
          fileName: file.name,
          contentType: file.type || 'application/pdf',
        })
        // 2) enviar o ficheiro direto para o R2 (não passa pelo nosso servidor)
        const put = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/pdf' },
          body: file,
        })
        if (!put.ok) throw new Error(`Falha ao enviar "${file.name}" (${put.status}).`)

        const { error: ie } = await supabase.from('exam_files').insert({
          course_code: course.code,
          course_name: course.name,
          kind,
          school_year: year || null,
          // Sem título próprio, guarda o nome original do ficheiro
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
          has_solutions: solutions,
          storage_path: path,
          file_size: file.size,
          uploaded_by: user.id,
          uploader_name: displayName || null,
        })
        // Se a linha falhar, o ficheiro fica órfão no R2 — mas sem linha não há
        // como o apagar via RLS, por isso avisa-se em vez de o esconder.
        if (ie) throw new Error(`${ie.message} (ficheiro "${file.name}" ficou por registar)`)
      }
      await onDone()
      reset(); onClose()
    } catch (e) {
      setErr(e.message || 'Não consegui enviar.')
    } finally {
      setSaving(false); setProgress('')
    }
  }

  return (
    <Modal open={open} onClose={close} title="Partilhar exames">
      {!course ? (
        <>
          <p className="text-sm text-slate-400 mb-3">Primeiro, escolhe a cadeira.</p>
          <input autoFocus className="input mb-3" placeholder="Pesquisar cadeira ou código..."
            value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {list.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Sem resultados.</p>}
            {list.map((c) => (
              <button key={c.code} type="button" onClick={() => setCourse(c)}
                className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left bg-white/[0.05] border border-white/10 hover:bg-white/10 active:scale-[0.99] transition">
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-slate-100 truncate">{c.name}</span>
                  <span className="block text-xs text-slate-500">
                    #{c.code}{myCodes.has(c.code) ? ' · tua' : ''}
                  </span>
                </span>
                <Icon name="chevron" className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => setCourse(null)} disabled={saving}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 bg-white/[0.05] border border-white/10 text-left disabled:opacity-50">
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-slate-100 truncate">{course.name}</span>
              <span className="block text-xs text-slate-500">#{course.code} · toca para mudar</span>
            </span>
            <Icon name="edit" className="w-4 h-4 text-slate-500 shrink-0" />
          </button>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <button key={k.v} type="button" onClick={() => setKind(k.v)} disabled={saving}
                  className={`py-2 seg ${kind === k.v ? 'seg-on' : 'seg-off'}`}>{k.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Ano letivo</label>
            <select className="input" value={year} onChange={(e) => setYear(e.target.value)} disabled={saving}>
              <option value="">Não sei</option>
              {SCHOOL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={solutions} disabled={saving}
              onChange={(e) => setSolutions(e.target.checked)}
              className="w-5 h-5 rounded accent-nova-500" />
            <span className="text-sm text-slate-200">Inclui resolução / soluções</span>
          </label>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Ficheiros (podes escolher vários)
            </label>
            <input type="file" multiple disabled={saving}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.zip"
              onChange={(e) => setFiles([...e.target.files])}
              className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-nova-600 file:text-white" />
            {files.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {files.length} ficheiro{files.length === 1 ? '' : 's'} · máx. {MAX_MB} MB cada
              </p>
            )}
          </div>

          {err && <p className="text-sm text-rose-300">{err}</p>}
          {progress && <p className="text-sm text-slate-400">{progress}</p>}

          <button type="button" onClick={submit} disabled={saving || !files.length}
            className="w-full py-3 rounded-xl text-white font-semibold disabled:opacity-40 active:scale-[0.99] transition"
            style={{ backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 100%)' }}>
            {saving ? 'A enviar...' : 'Enviar para a biblioteca'}
          </button>
          <p className="text-xs text-slate-600 text-center">
            Fica visível para todos os alunos da app. Só tu podes apagar o que enviaste.
          </p>
        </div>
      )}
    </Modal>
  )
}
