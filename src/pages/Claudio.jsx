import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { useCollection } from '../lib/useCollection.js'
import { Icon } from '../components/ui.jsx'
import { hhmm, DAYS, COURSE_COLORS } from '../lib/helpers.js'

const SUGGESTIONS = [
  'Que cadeiras me recomendas para o próximo semestre?',
  'Cria uma tarefa: rever apontamentos de Marketing.',
  'O que muda com o plano de transição 26/27 para mim?',
  'Monta-me o horário do próximo semestre.',
]

function renderText(text) {
  return text.split('\n').map((line, i) => (
    <span key={i}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>
      )}
      {'\n'}
    </span>
  ))
}

export default function Claudio() {
  const { displayName, program, academicYear, semester } = useAuth()
  const coursesCtx = useCourses()
  const courses = coursesCtx.rows
  const schedule = useCollection('schedule_blocks', { orderBy: 'start_time', ascending: true })
  const assignments = useCollection('assignments', { orderBy: 'due_date', ascending: true })
  const grades = useCollection('grades', { orderBy: 'created_at', ascending: true })
  const notes = useCollection('notes', { orderBy: 'created_at', ascending: false })

  const [chat, setChat] = useState([])       // mensagens para mostrar
  const [apiMsgs, setApiMsgs] = useState([])  // mensagens em formato Anthropic
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat, loading])

  function buildContext() {
    const compsOf = (id) => grades.rows.filter((g) => g.course_id === id)
      .map((g) => ({ titulo: g.title, peso: g.weight, nota: g.grade }))
    const dayName = (n) => DAYS.find((d) => d.n === n)?.long || n
    return {
      aluno: { nome: displayName, curso: program, ano: academicYear, semestre: semester },
      cadeiras: courses.map((c) => ({
        nome: c.name, codigo: c.code, ects: c.ects, ano: c.year, semestre: c.term,
        equivalencia: !!c.is_equivalence, nota_final: c.final_grade, componentes: compsOf(c.id),
      })),
      horario: schedule.rows.map((b) => ({
        cadeira: b.title, dia: dayName(b.day_of_week),
        inicio: hhmm(b.start_time), fim: hhmm(b.end_time), sala: b.location, tipo: b.kind,
      })),
      prazos: assignments.rows.filter((a) => a.status !== 'done').map((a) => ({
        titulo: a.title, tipo: a.kind, data: a.due_date,
      })),
    }
  }

  // Resolver nome/código de cadeira -> id
  function findCourseId(q) {
    if (!q) return null
    const s = String(q).toLowerCase().trim()
    const hit = courses.find((c) =>
      (c.name && c.name.toLowerCase().includes(s)) || (c.code && String(c.code).toLowerCase() === s))
    return hit ? hit.id : null
  }

  // Executar uma ação (tool) do Cláudio na base de dados do utilizador
  async function execTool(name, input) {
    const inp = input || {}
    if (name === 'criar_tarefa') {
      await notes.add({ title: inp.titulo, body: inp.detalhes || null, is_task: true, done: false, course_id: findCourseId(inp.cadeira) })
      return `✓ Tarefa criada: "${inp.titulo}"`
    }
    if (name === 'criar_nota') {
      await notes.add({ title: inp.titulo || null, body: inp.texto, is_task: false, done: false, course_id: findCourseId(inp.cadeira) })
      return `✓ Nota criada${inp.titulo ? `: "${inp.titulo}"` : ''}`
    }
    if (name === 'criar_prazo') {
      const d = inp.data ? new Date(inp.data) : null
      const due = d && !isNaN(d.getTime()) ? d.toISOString() : null
      await assignments.add({ title: inp.titulo, kind: inp.tipo || 'trabalho', due_date: due, status: 'todo', course_id: findCourseId(inp.cadeira) })
      return `✓ Prazo criado: "${inp.titulo}"`
    }
    if (name === 'adicionar_aula') {
      await schedule.add({ title: inp.titulo, day_of_week: Number(inp.dia), start_time: inp.inicio, end_time: inp.fim, location: inp.sala || null, kind: inp.tipo || 'aula', course_id: findCourseId(inp.cadeira) })
      return `✓ Aula adicionada ao horário: "${inp.titulo}"`
    }
    if (name === 'criar_cadeira') {
      const color = COURSE_COLORS[courses.length % COURSE_COLORS.length]
      await coursesCtx.add({ name: inp.nome, code: inp.codigo || null, ects: inp.ects ?? 6, year: inp.ano ?? null, term: inp.semestre ?? null, color })
      return `✓ Cadeira criada: "${inp.nome}"`
    }
    throw new Error(`Ferramenta desconhecida: ${name}`)
  }

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    let msgs = [...apiMsgs, { role: 'user', content }]
    setChat((c) => [...c, { role: 'user', text: content }])
    setInput('')
    setLoading(true)
    try {
      let guard = 0
      while (guard++ < 6) {
        const res = await fetch('/api/claudio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs, context: buildContext() }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro do servidor.')

        const assistantContent = data.content || []
        msgs = [...msgs, { role: 'assistant', content: assistantContent }]

        const txt = assistantContent.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
        if (txt) setChat((c) => [...c, { role: 'assistant', text: txt }])

        const toolUses = assistantContent.filter((b) => b.type === 'tool_use')
        if (data.stop_reason === 'tool_use' && toolUses.length) {
          const results = []
          for (const tu of toolUses) {
            let out, ok = true
            try { out = await execTool(tu.name, tu.input) }
            catch (e) { out = `⚠️ Não consegui: ${e.message || e}`; ok = false }
            setChat((c) => [...c, { role: 'action', text: out, ok }])
            results.push({ type: 'tool_result', tool_use_id: tu.id, content: out, is_error: !ok })
          }
          msgs = [...msgs, { role: 'user', content: results }]
          continue // volta a chamar para o Cláudio confirmar
        }
        break
      }
      setApiMsgs(msgs)
    } catch (e) {
      setChat((c) => [...c, { role: 'error', text: e.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 168px)' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-nova-500/20 text-nova-200 flex items-center justify-center">
          <Icon name="spark" className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">Cláudio</h1>
          <p className="text-xs text-slate-400">O teu assistente da Nova SBE</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
        {chat.length === 0 ? (
          <div className="pt-2">
            <div className="card p-4 text-sm text-slate-300 leading-relaxed">
              Olá{displayName ? `, ${displayName}` : ''}! 👋 Sou o Cláudio. Já tenho os
              <b> horários e exames oficiais</b> de todas as cadeiras. Posso montar o teu horário
              sem sobreposições, explicar as regras do curso e <b>criar tarefas, prazos, notas e
              cadeiras</b> por ti. Diz-me o que precisas.
            </div>
            <p className="text-xs text-slate-500 mt-4 mb-2 px-1">Experimenta:</p>
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="w-full text-left text-sm rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2.5 text-slate-200 hover:bg-white/10 transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.map((m, i) => {
            if (m.role === 'action') {
              return (
                <div key={i} className="flex justify-center">
                  <div className={`text-xs font-medium rounded-full px-3 py-1.5 border ${
                    m.ok ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
                         : 'bg-amber-500/15 text-amber-200 border-amber-500/25'}`}>
                    {m.text}
                  </div>
                </div>
              )
            }
            const isUser = m.role === 'user'
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                  isUser ? 'bg-nova-600 text-white rounded-br-md'
                    : m.role === 'error' ? 'bg-rose-500/15 text-rose-200 border border-rose-500/20'
                      : 'bg-white/[0.06] text-slate-100 border border-white/10 rounded-bl-md'
                }`}>
                  {m.role === 'assistant' ? renderText(m.text) : m.text}
                </div>
              </div>
            )
          })
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-end gap-2 pt-3">
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Escreve a tua mensagem..."
          className="input flex-1 resize-none max-h-32" />
        <button type="submit" disabled={loading || !input.trim()}
          className="w-11 h-11 flex-shrink-0 rounded-xl text-white flex items-center justify-center disabled:opacity-40 active:scale-95 transition"
          style={{ backgroundImage: 'linear-gradient(135deg, #3d78bf 0%, #1f5aa3 100%)' }}>
          <Icon name="send" className="w-5 h-5" />
        </button>
      </form>
    </div>
  )
}
