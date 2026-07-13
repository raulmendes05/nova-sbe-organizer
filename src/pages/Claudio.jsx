import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useCourses } from '../context/CoursesContext.jsx'
import { useCollection } from '../lib/useCollection.js'
import { Icon } from '../components/ui.jsx'
import { hhmm, DAYS } from '../lib/helpers.js'

const SUGGESTIONS = [
  'Que cadeiras me recomendas para o próximo semestre?',
  'Explica-me como funciona a média nesta app.',
  'O que muda com o plano de transição 26/27 para mim?',
  'Preciso de fazer Business Principles?',
]

// Render simples de **negrito** e quebras de linha
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
  const { rows: courses } = useCourses()
  const schedule = useCollection('schedule_blocks', { orderBy: 'start_time', ascending: true })
  const assignments = useCollection('assignments', { orderBy: 'due_date', ascending: true })
  const grades = useCollection('grades', { orderBy: 'created_at', ascending: true })

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

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

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/claudio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context: buildContext() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro do servidor.')
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${e.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 168px)' }}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-nova-500/20 text-nova-200 flex items-center justify-center">
          <Icon name="spark" className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white leading-tight">Cláudio</h1>
          <p className="text-xs text-slate-400">O teu assistente da Nova SBE</p>
        </div>
      </div>

      {/* Conversa */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-1 px-1 space-y-3">
        {messages.length === 0 ? (
          <div className="pt-2">
            <div className="card p-4 text-sm text-slate-300 leading-relaxed">
              Olá{displayName ? `, ${displayName}` : ''}! 👋 Sou o Cláudio. Posso ajudar-te a
              montar o horário sem sobreposições, explicar as regras do curso e como usar a app.
              Já tenho os <b>horários oficiais</b> de todas as cadeiras — diz-me só <b>que cadeiras
              queres fazer</b> (ou pede-me para sugerir) e eu trato do resto.
            </div>
            <p className="text-xs text-slate-500 mt-4 mb-2 px-1">Experimenta perguntar:</p>
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
          messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-nova-600 text-white rounded-br-md'
                  : m.error
                    ? 'bg-rose-500/15 text-rose-200 border border-rose-500/20'
                    : 'bg-white/[0.06] text-slate-100 border border-white/10 rounded-bl-md'
              }`}>
                {m.role === 'assistant' ? renderText(m.content) : m.content}
              </div>
            </div>
          ))
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

      {/* Caixa de escrita */}
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
