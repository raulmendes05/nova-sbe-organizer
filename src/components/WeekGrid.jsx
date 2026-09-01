import { useMemo } from 'react'
import { hhmm } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

const PX_PER_MIN = 1.05          // 1h ≈ 63px
const MIN_BLOCK = 26             // altura mínima para um bloco continuar legível
const PRAZO_H = 20               // etiqueta de um prazo solto (não é uma aula)

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

/**
 * Grelha de UMA semana concreta. Os dias vêm de fora já resolvidos (data, o que
 * o calendário académico diz do dia e as aulas que lá correm) — ver lib/week.js.
 */
export default function WeekGrid({ days: semana, courseById, onPick }) {
  const { t } = useT()

  // Seg–Sex aparecem sempre para a semana não ficar deformada; fim de semana só
  // se tiver mesmo alguma coisa.
  const days = useMemo(
    () => semana.filter((d) => d.n <= 5 || d.blocks.length), [semana])
  const blocks = useMemo(() => days.flatMap((d) => d.blocks), [days])

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
    for (const d of days) m[d.n] = layout(d.blocks)
    return m
  }, [days])

  return (
    <div className="card overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Cabeçalho dos dias */}
        <div className="flex sticky top-0 z-10 bg-[#0d1626]/95 backdrop-blur border-b border-white/10">
          <div className="w-11 shrink-0" />
          {days.map((d) => (
            <div key={d.n} className="flex-1 text-center py-2">
              <span className={`text-xs font-semibold ${d.hoje ? 'text-nova-300' : 'text-slate-400'}`}>
                {t(`day.${d.n}.short`)} <span className="tabular-nums opacity-70">{d.date.getDate()}</span>
              </span>
              {d.hoje && <span className="block mx-auto mt-1 h-0.5 w-6 rounded-full bg-nova-400" />}
              {d.aviso && (
                <span className="block text-[9px] text-amber-300/80 leading-tight px-0.5 mt-0.5 line-clamp-2">
                  {d.aviso}
                </span>
              )}
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
                  className={`flex-1 relative border-l border-white/[0.06] ${d.hoje ? 'bg-nova-500/[0.04]' : ''} ${d.semAulas ? 'bg-white/[0.02]' : ''}`}>
                  {(byDay[d.n] || []).map((b) => {
                    const s = toMin(b.start_time)
                    const e = toMin(b.end_time)
                    const c = courseById[b.course_id]
                    const w = 100 / (b.cols || 1)
                    const lado = { left: `calc(${b.col * w}% + 2px)`, width: `calc(${w}% - 4px)` }

                    // Um prazo que não tem aula onde encaixar aparece como uma
                    // etiqueta fina à hora a que é — não é uma aula, não deve
                    // ocupar o espaço de uma.
                    if (b.__prazo) {
                      return (
                        <div key={b.id} title={`${b.title} · ${hhmm(b.start_time)}`}
                          className="absolute flex items-center gap-1.5 rounded-md px-1.5 border border-amber-400/40 bg-amber-400/[0.12]"
                          style={{ ...lado, top: (s - from) * PX_PER_MIN + 1, height: PRAZO_H }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                          <span className="text-[10px] font-semibold text-amber-100 truncate">
                            <span className="tabular-nums text-amber-200/70">{hhmm(b.start_time)}</span> {b.title}
                          </span>
                        </div>
                      )
                    }

                    const color = c?.color || '#3d78bf'
                    const h = Math.max(MIN_BLOCK, (e - s) * PX_PER_MIN)
                    // Prazos que acontecem NESTA aula (ver lib/week.js) — a
                    // apresentação de Ética aparece na aula de Ética.
                    const prazos = b.prazos || []
                    // Fora da hora da aula, a hora vem à frente: o título é
                    // que fica cortado numa coluna estreita, não ela.
                    const etiqueta = (p) => (p.dentro ? p.title : `${p.hora} · ${p.title}`)
                    const titulo = [`${b.title} · ${hhmm(b.start_time)}-${hhmm(b.end_time)}`,
                      ...prazos.map((p) => `${t(p.dentro ? 'schedule.deadlineInClass' : 'schedule.deadlineSameDay')}: ${etiqueta(p)}`)].join('\n')
                    return (
                      <button key={b.id} onClick={() => onPick(b)}
                        title={titulo}
                        className="absolute rounded-lg px-1.5 py-1 text-left overflow-hidden transition active:scale-[0.98]"
                        style={{
                          ...lado,
                          top: (s - from) * PX_PER_MIN + 1,
                          height: h - 2,
                          background: `linear-gradient(180deg, ${color}38, ${color}22)`,
                          borderLeft: `3px solid ${color}`,
                          boxShadow: prazos.length ? 'inset 0 0 0 1.5px rgba(245, 158, 11, 0.55)' : undefined,
                        }}>
                        <span className="block text-[11px] font-semibold text-slate-100 leading-tight line-clamp-2">
                          {b.title}
                        </span>
                        {prazos.map((p) => (
                          <span key={p.id}
                            className="mt-1 flex items-center gap-1 rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-semibold text-amber-100 leading-tight">
                            <span className="w-1 h-1 rounded-full bg-amber-300 shrink-0" />
                            <span className="truncate">{etiqueta(p)}</span>
                          </span>
                        ))}
                        {h > 44 + prazos.length * 13 && (
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
