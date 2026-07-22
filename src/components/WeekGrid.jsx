import { useMemo } from 'react'
import { DAYS, hhmm, todayDow } from '../lib/helpers.js'

const PX_PER_MIN = 1.05          // 1h ≈ 63px
const MIN_BLOCK = 26             // altura mínima para um bloco continuar legível

const toMin = (t) => {
  const [h, m] = hhmm(t).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const fmt = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Reparte blocos que se sobrepõem no mesmo dia por colunas lado a lado,
 * para que nenhum fique escondido por baixo de outro.
 */
function layout(blocks) {
  const sorted = [...blocks].sort((a, b) => toMin(a.start_time) - toMin(b.start_time))
  const out = []
  let cluster = []
  const flush = () => {
    if (!cluster.length) return
    // dentro de um grupo que se cruza, cada bloco vai para a 1ª coluna livre
    const cols = []
    for (const b of cluster) {
      let i = cols.findIndex((end) => end <= toMin(b.start_time))
      if (i === -1) { i = cols.length; cols.push(0) }
      cols[i] = toMin(b.end_time)
      out.push({ ...b, col: i })
    }
    for (const b of out.slice(-cluster.length)) b.cols = cols.length
    cluster = []
  }
  let clusterEnd = -1
  for (const b of sorted) {
    if (cluster.length && toMin(b.start_time) >= clusterEnd) flush()
    cluster.push(b)
    clusterEnd = Math.max(clusterEnd, toMin(b.end_time))
  }
  flush()
  return out
}

export default function WeekGrid({ blocks, courseById, onPick }) {
  const today = todayDow()

  // Só se mostram os dias que têm aulas (o fim de semana raramente tem),
  // mas Seg–Sex aparecem sempre para a semana não ficar deformada.
  const days = useMemo(() => {
    const used = new Set(blocks.map((b) => b.day_of_week))
    return DAYS.filter((d) => d.n <= 5 || used.has(d.n))
  }, [blocks])

  // A grelha começa/acaba nas horas mesmo usadas, com folga de meia hora.
  const [from, to] = useMemo(() => {
    if (!blocks.length) return [8 * 60, 19 * 60]
    const lo = Math.min(...blocks.map((b) => toMin(b.start_time)))
    const hi = Math.max(...blocks.map((b) => toMin(b.end_time)))
    return [Math.floor((lo - 30) / 60) * 60, Math.ceil((hi + 30) / 60) * 60]
  }, [blocks])

  const height = (to - from) * PX_PER_MIN
  const hours = []
  for (let m = from; m <= to; m += 60) hours.push(m)

  const byDay = useMemo(() => {
    const m = {}
    for (const d of days) m[d.n] = layout(blocks.filter((b) => b.day_of_week === d.n))
    return m
  }, [blocks, days])

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Cabeçalho dos dias */}
        <div className="flex sticky top-0 z-10 bg-[#0d1626]/95 backdrop-blur border-b border-white/10">
          <div className="w-11 shrink-0" />
          {days.map((d) => (
            <div key={d.n} className="flex-1 text-center py-2">
              <span className={`text-xs font-semibold ${d.n === today ? 'text-nova-300' : 'text-slate-400'}`}>
                {d.short}
              </span>
              {d.n === today && <span className="block mx-auto mt-1 h-0.5 w-6 rounded-full bg-nova-400" />}
            </div>
          ))}
        </div>

        <div className="flex">
          {/* Régua das horas */}
          <div className="w-11 shrink-0 relative" style={{ height }}>
            {hours.map((m) => (
              <span key={m} className="absolute right-1.5 -translate-y-1/2 text-[10px] tabular-nums text-slate-500"
                style={{ top: (m - from) * PX_PER_MIN }}>
                {fmt(m)}
              </span>
            ))}
          </div>

          {/* Colunas dos dias */}
          <div className="flex-1 relative" style={{ height }}>
            {/* linhas das horas */}
            {hours.map((m) => (
              <div key={m} className="absolute inset-x-0 border-t border-white/[0.06]"
                style={{ top: (m - from) * PX_PER_MIN }} />
            ))}
            <div className="flex h-full">
              {days.map((d) => (
                <div key={d.n}
                  className={`flex-1 relative border-l border-white/[0.06] ${d.n === today ? 'bg-nova-500/[0.04]' : ''}`}>
                  {(byDay[d.n] || []).map((b) => {
                    const s = toMin(b.start_time)
                    const e = toMin(b.end_time)
                    const c = courseById[b.course_id]
                    const color = c?.color || '#3d78bf'
                    const h = Math.max(MIN_BLOCK, (e - s) * PX_PER_MIN)
                    const w = 100 / (b.cols || 1)
                    return (
                      <button key={b.id} onClick={() => onPick(b)} title={`${b.title} · ${hhmm(b.start_time)}-${hhmm(b.end_time)}`}
                        className="absolute rounded-lg px-1.5 py-1 text-left overflow-hidden active:scale-[0.98] transition"
                        style={{
                          top: (s - from) * PX_PER_MIN + 1,
                          height: h - 2,
                          left: `calc(${b.col * w}% + 2px)`,
                          width: `calc(${w}% - 4px)`,
                          background: `linear-gradient(180deg, ${color}38, ${color}22)`,
                          borderLeft: `3px solid ${color}`,
                        }}>
                        <span className="block text-[11px] font-semibold text-slate-100 leading-tight line-clamp-2">
                          {b.title}
                        </span>
                        {h > 44 && (
                          <span className="block text-[9px] text-slate-400 mt-0.5 leading-tight">
                            {hhmm(b.start_time)}–{hhmm(b.end_time)}
                            {b.location ? ` · ${b.location}` : ''}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
