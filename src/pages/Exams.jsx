import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  { v: 'exame', label: 'Exames', one: 'Exame', tone: 'bg-nova-500/20 text-nova-200' },
  { v: 'teste', label: 'Midterms', one: 'Midterm', tone: 'bg-violet-500/20 text-violet-200' },
  { v: 'recurso', label: 'Recursos', one: 'Recurso', tone: 'bg-amber-500/20 text-amber-200' },
  { v: 'outro', label: 'Outros', one: 'Outro', tone: 'bg-slate-500/20 text-slate-300' },
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

/* ============================================================
   Página: lista de cadeiras (/provas) ou uma cadeira (/provas/:code)
   ============================================================ */
export default function Exams() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, displayName, academicYear, semester } = useAuth()
  const myCourses = useCourses().rows

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [modal, setModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const all = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from('exam_files').select('*')
        .order('school_year', { ascending: false })
        .range(from, from + 999)
      if (error) { setError(error.message); setLoading(false); return }
      all.push(...data)
      if (data.length < 1000) break
    }
    setRows(all); setError(null); setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Cadeiras que o aluno está a fazer AGORA (ano + semestre do perfil).
  // Não as que já fez — essas já não interessam para estudar.
  const currentCodes = useMemo(() => {
    const y = Number(academicYear)
    const t = Number(semester)
    return new Set(
      myCourses
        .filter((c) => !c.is_equivalence && Number(c.year) === y && Number(c.term) === t)
        .map((c) => c.code).filter(Boolean).map(String)
    )
  }, [myCourses, academicYear, semester])

  async function download(row) {
    setBusy(row.storage_path)
    try {
      const ext = row.storage_path.split('.').pop()
      const name = [row.course_code, kindOf(row.kind).one, row.school_year || '']
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
      await signUrl({ action: 'delete', path: row.storage_path })
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (e) {
      setError(e.message || 'Não consegui apagar.')
    } finally {
      setBusy(null)
    }
  }

  const errorBar = error && (
    <div className="card p-3 mb-3 text-sm text-rose-200 bg-rose-500/10 border-rose-500/20 flex items-start gap-2">
      <span className="flex-1">{error}</span>
      <button onClick={() => setError(null)} className="text-rose-300">
        <Icon name="close" className="w-4 h-4" />
      </button>
    </div>
  )

  const shared = { rows, loading, busy, download, removeFile, user, errorBar }

  return (
    <div className="pb-24">
      {code
        ? <CourseView {...shared} code={code} onBack={() => navigate('/provas')} onUpload={() => setModal(true)} />
        : <CourseList {...shared} currentCodes={currentCodes} onOpen={(c) => navigate(`/provas/${c}`)} onUpload={() => setModal(true)} />}

      <Fab onClick={() => setModal(true)} label="Enviar prova" />

      <UploadModal
        open={modal}
        onClose={() => setModal(false)}
        user={user}
        displayName={displayName}
        currentCodes={currentCodes}
        lockedCode={code || null}
        onDone={load}
      />
    </div>
  )
}

/* ---------- Lista de cadeiras ---------- */
function CourseList({ rows, loading, currentCodes, onOpen, errorBar }) {
  const [q, setQ] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)

  const groups = useMemo(() => {
    const query = norm(q.trim())
    const map = new Map()
    for (const r of rows) {
      if (onlyMine && !currentCodes.has(String(r.course_code))) continue
      if (query && !norm(r.course_name).includes(query) && !String(r.course_code).includes(query)) continue
      const g = map.get(r.course_code)
      if (g) { g.n++; g.kinds.add(r.kind) }
      else map.set(r.course_code, { code: r.course_code, name: r.course_name, n: 1, kinds: new Set([r.kind]) })
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [rows, q, onlyMine, currentCodes])

  const total = rows.length

  return (
    <>
      <PageHeader
        title="Provas antigas"
        subtitle={total ? `${total} ficheiros · ${new Set(rows.map((r) => r.course_code)).size} cadeiras` : 'Exames e testes de anos anteriores'}
      />

      <input className="input mb-2" placeholder="Pesquisar cadeira ou código..."
        value={q} onChange={(e) => setQ(e.target.value)} />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button type="button" onClick={() => setOnlyMine(false)}
          className={`py-2 seg ${!onlyMine ? 'seg-on' : 'seg-off'}`}>Todas</button>
        <button type="button" onClick={() => setOnlyMine(true)}
          className={`py-2 seg ${onlyMine ? 'seg-on' : 'seg-off'}`}>Este semestre</button>
      </div>

      {errorBar}

      {loading ? <Spinner /> : groups.length === 0 ? (
        <EmptyState icon="archive"
          title={onlyMine && currentCodes.size === 0 ? 'Sem cadeiras este semestre' : total === 0 ? 'A biblioteca está vazia' : 'Sem resultados'}
          hint={onlyMine && currentCodes.size === 0
            ? 'Adiciona as cadeiras deste semestre em Notas para as veres aqui.'
            : onlyMine ? 'Ainda não há provas das cadeiras que estás a fazer.'
              : total === 0 ? 'Carrega no + para enviares exames ou testes antigos.'
                : 'Tenta outra pesquisa.'} />
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <button key={g.code} type="button" onClick={() => onOpen(g.code)}
              className="card w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.06] active:scale-[0.99] transition">
              <span className="w-9 h-9 rounded-xl bg-nova-500/15 text-nova-300 flex items-center justify-center shrink-0">
                <Icon name="archive" className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-100 truncate">{g.name}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  #{g.code} · {g.n} ficheiro{g.n === 1 ? '' : 's'}
                  {currentCodes.has(String(g.code)) && <span className="text-nova-300"> · este semestre</span>}
                </span>
              </span>
              <Icon name="chevron" className="w-4 h-4 text-slate-500 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/* ---------- Uma cadeira, com separadores por tipo de avaliação ---------- */
function CourseView({ rows, loading, code, onBack, busy, download, removeFile, user, errorBar }) {
  const mine = useMemo(() => rows.filter((r) => String(r.course_code) === String(code)), [rows, code])
  const name = mine[0]?.course_name || CATALOG.find((c) => c.code === code)?.name || code

  // Só se mostram os separadores que têm mesmo ficheiros
  const tabs = useMemo(
    () => KINDS.map((k) => ({ ...k, n: mine.filter((r) => r.kind === k.v).length })).filter((k) => k.n > 0),
    [mine]
  )
  const [tab, setTab] = useState(null)
  const active = tab && tabs.some((t) => t.v === tab) ? tab : tabs[0]?.v

  const files = useMemo(() => mine
    .filter((r) => r.kind === active)
    .sort((a, b) => String(b.school_year || '').localeCompare(String(a.school_year || ''))
      || String(a.title || '').localeCompare(String(b.title || ''))),
  [mine, active])

  // Agrupar por ano letivo dentro do separador
  const byYear = useMemo(() => {
    const m = new Map()
    for (const f of files) {
      const y = f.school_year || 'Sem ano'
      if (!m.has(y)) m.set(y, [])
      m.get(y).push(f)
    }
    return [...m.entries()]
  }, [files])

  if (loading) return <Spinner />

  return (
    <>
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 mb-3 -ml-1">
        <Icon name="chevron" className="w-4 h-4 rotate-180" /> Todas as cadeiras
      </button>

      <PageHeader title={name} subtitle={`#${code} · ${mine.length} ficheiro${mine.length === 1 ? '' : 's'}`} />

      {errorBar}

      {tabs.length === 0 ? (
        <EmptyState icon="archive" title="Ainda não há provas desta cadeira"
          hint="Carrega no + para seres o primeiro a partilhar." />
      ) : (
        <>
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0,1fr))` }}>
            {tabs.map((t) => (
              <button key={t.v} type="button" onClick={() => setTab(t.v)}
                className={`py-2 seg ${active === t.v ? 'seg-on' : 'seg-off'}`}>
                {t.label} <span className="opacity-60">{t.n}</span>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {byYear.map(([year, list]) => (
              <div key={year}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5 px-0.5">{year}</p>
                <div className="card divide-y divide-white/5">
                  {list.map((f) => {
                    const working = busy === f.storage_path
                    return (
                      <div key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="flex-1 min-w-0">
                          <span className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-slate-100">
                              {f.school_year || 'Sem ano'}
                            </span>
                            {f.has_solutions && (
                              <span className="chip bg-emerald-500/20 text-emerald-200">c/ resolução</span>
                            )}
                          </span>
                          {f.title && <span className="block text-xs text-slate-500 mt-0.5 truncate">{f.title}</span>}
                          <span className="block text-[11px] text-slate-600 mt-0.5">{prettySize(f.file_size)}</span>
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
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/* ---------- Modal de envio (aceita vários ficheiros de uma vez) ---------- */
function UploadModal({ open, onClose, user, displayName, currentCodes, lockedCode, onDone }) {
  const preset = lockedCode ? CATALOG.find((c) => c.code === lockedCode) : null
  const [course, setCourse] = useState(preset || null)
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('exame')
  const [year, setYear] = useState(SCHOOL_YEARS[0])
  const [solutions, setSolutions] = useState(false)
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState('')
  const [err, setErr] = useState(null)

  // Ao abrir dentro de uma cadeira, já vem escolhida
  useEffect(() => {
    if (open && lockedCode) setCourse(CATALOG.find((c) => c.code === lockedCode) || null)
  }, [open, lockedCode])

  function reset() {
    setCourse(lockedCode ? CATALOG.find((c) => c.code === lockedCode) || null : null)
    setQ(''); setKind('exame'); setYear(SCHOOL_YEARS[0])
    setSolutions(false); setFiles([]); setErr(null); setProgress('')
  }

  function close() { if (!saving) { reset(); onClose() } }

  const list = useMemo(() => {
    const query = norm(q.trim())
    const hits = query
      ? CATALOG.filter((c) => norm(c.name).includes(query) || c.code.includes(query))
      : CATALOG
    return [...hits].sort((a, b) => {
      const am = currentCodes.has(a.code) ? 0 : 1
      const bm = currentCodes.has(b.code) ? 0 : 1
      return am - bm || a.name.localeCompare(b.name)
    })
  }, [q, currentCodes])

  async function submit() {
    if (!course || !files.length) return
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024)
    if (tooBig) { setErr(`"${tooBig.name}" tem mais de ${MAX_MB} MB.`); return }

    setSaving(true); setErr(null)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setProgress(`A enviar ${i + 1} de ${files.length}...`)
        const { url, path } = await signUrl({
          action: 'upload',
          courseCode: course.code,
          fileName: file.name,
          contentType: file.type || 'application/pdf',
        })
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
          title: file.name.replace(/\.[^.]+$/, '').slice(0, 120),
          has_solutions: solutions,
          storage_path: path,
          file_size: file.size,
          uploaded_by: user.id,
          uploader_name: displayName || null,
        })
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
    <Modal open={open} onClose={close} title="Partilhar provas">
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
                    #{c.code}{currentCodes.has(c.code) ? ' · este semestre' : ''}
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
                  className={`py-2 seg ${kind === k.v ? 'seg-on' : 'seg-off'}`}>{k.one}</button>
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
