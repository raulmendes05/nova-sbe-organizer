import { useMemo, useState } from 'react'
import { localeOf, resolveGrade, weightedAvg, termLabel, termKey } from '../lib/helpers.js'
import { useT } from '../i18n/index.jsx'

// Desenhado à mão em SVG de propósito: uma biblioteca de gráficos custava mais
// de 100 kB num bundle que já vai em 650 e que tem de abrir offline.
const L = 30    // margem à esquerda, para os números do eixo
const R = 6
const T = 10
const B = 20
const W = 300
const H = 130

/** Os pontos da média ao longo do tempo, das duas maneiras de a ler. */
function pontos({ courses, gradesOf, modo, t }) {
  const comNota = courses
    .map((c) => ({ c, avg: resolveGrade(c, gradesOf(c.id)), ects: Number(c.ects || 0) }))
    .filter((x) => x.avg !== null)
  if (comNota.length < 2) return []

  if (modo === 'semestre') {
    // Por semestre: a média acumulada no fim de cada ano/semestre. É a curva
    // honesta — não depende de quando é que o aluno escreveu as notas na app.
    // termKey devolve um número ordenável (ano*10 + semestre): 11, 12, 21...
    const chaves = [...new Set(comNota
      .filter((x) => x.c.year && x.c.term)
      .map((x) => termKey(x.c.year, x.c.term)))].sort((a, b) => a - b)
    const out = []
    for (const k of chaves) {
      const ate = comNota.filter((x) => x.c.year && x.c.term && termKey(x.c.year, x.c.term) <= k)
      const media = weightedAvg(ate.map((x) => ({ avg: x.avg, ects: x.ects })))
      if (media === null) continue
      out.push({ x: String(k), valor: media, rotulo: termLabel(Math.floor(k / 10), k % 10, t), n: ate.length })
    }
    return out
  }

  // Cronológico: a média acumulada de cada vez que uma cadeira passou a ter
  // nota. O `created_at` é quando ele a ESCREVEU, não quando saiu — quem lançar
  // o histórico todo de uma vez vê os primeiros pontos empilhados.
  const ordenadas = comNota
    .map((x) => ({ ...x, quando: (gradesOf(x.c.id).map((g) => g.created_at).sort().pop()) || x.c.created_at }))
    .sort((a, b) => String(a.quando).localeCompare(String(b.quando)))
  const out = []
  const ate = []
  for (const x of ordenadas) {
    ate.push(x)
    const media = weightedAvg(ate.map((y) => ({ avg: y.avg, ects: y.ects })))
    if (media === null) continue
    out.push({ x: x.quando, valor: media, rotulo: x.c.name, n: ate.length })
  }
  return out
}

export default function GradeChart({ courses, gradesOf, goal, lang }) {
  const { t } = useT()
  const [modo, setModo] = useState('semestre')
  const [escolhido, setEscolhido] = useState(null)

  const dados = useMemo(() => pontos({ courses, gradesOf, modo, t }), [courses, gradesOf, modo, t])
  // Sem dois pontos não há linha nenhuma para ver.
  const alternativos = useMemo(
    () => pontos({ courses, gradesOf, modo: modo === 'semestre' ? 'tempo' : 'semestre', t }),
    [courses, gradesOf, modo, t])

  if (dados.length < 2 && alternativos.length < 2) return null

  const usar = dados.length >= 2 ? dados : alternativos
  const valores = usar.map((p) => p.valor)
  const alvo = Number(goal) || null
  // A escala nunca é 0–20: ficaria uma linha achatada onde não se vê nada.
  const min = Math.max(0, Math.floor(Math.min(...valores, alvo ?? 20) - 1))
  const max = Math.min(20, Math.ceil(Math.max(...valores, alvo ?? 0) + 1))
  const escalaY = (v) => T + (H - T - B) * (1 - (v - min) / (max - min || 1))
  const escalaX = (i) => L + (W - L - R) * (usar.length === 1 ? 0.5 : i / (usar.length - 1))

  const linha = usar.map((p, i) => `${escalaX(i)},${escalaY(p.valor)}`).join(' ')
  const area = `${L},${H - B} ${linha} ${escalaX(usar.length - 1)},${H - B}`
  const ultimo = usar[usar.length - 1]
  const delta = usar.length > 1 ? ultimo.valor - usar[usar.length - 2].valor : 0
  const ponto = escolhido !== null ? usar[escolhido] : null

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-sm font-semibold text-slate-200">{t('chart.title')}</p>
          <p className="text-xs text-slate-500">{t(modo === 'semestre' ? 'chart.bySemester' : 'chart.byTime')}</p>
        </div>
        {dados.length >= 2 && alternativos.length >= 2 && (
          <button onClick={() => { setModo(modo === 'semestre' ? 'tempo' : 'semestre'); setEscolhido(null) }}
            className="text-xs text-nova-300 shrink-0">
            {t(modo === 'semestre' ? 'chart.switchTime' : 'chart.switchSemester')}
          </button>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-2" role="img" aria-label={t('chart.title')}>
        <defs>
          <linearGradient id="grad-media" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d78bf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3d78bf" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[max, (max + min) / 2, min].map((v) => (
          <g key={v}>
            <line x1={L} y1={escalaY(v)} x2={W - R} y2={escalaY(v)} stroke="#ffffff" strokeOpacity="0.07" />
            <text x={L - 5} y={escalaY(v) + 3} textAnchor="end" fontSize="8" fill="#64748b">{v.toFixed(0)}</text>
          </g>
        ))}

        {/* A meta que ele definiu: dá sentido à linha toda. */}
        {alvo && alvo >= min && alvo <= max && (
          <>
            <line x1={L} y1={escalaY(alvo)} x2={W - R} y2={escalaY(alvo)}
              stroke="#f0a500" strokeOpacity="0.6" strokeDasharray="3 3" />
            <text x={W - R} y={escalaY(alvo) - 3} textAnchor="end" fontSize="8" fill="#f0a500">
              {t('chart.goal', { n: alvo })}
            </text>
          </>
        )}

        <polygon points={area} fill="url(#grad-media)" />
        <polyline points={linha} fill="none" stroke="#5b9bd5" strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round" />

        {usar.map((p, i) => (
          <g key={p.x} onClick={() => setEscolhido(escolhido === i ? null : i)} style={{ cursor: 'pointer' }}>
            <circle cx={escalaX(i)} cy={escalaY(p.valor)} r="9" fill="transparent" />
            <circle cx={escalaX(i)} cy={escalaY(p.valor)} r={escolhido === i ? 4 : 2.6}
              fill={escolhido === i ? '#ffffff' : '#5b9bd5'} />
          </g>
        ))}
      </svg>

      <div className="flex items-end justify-between gap-3 mt-1">
        <p className="text-xs text-slate-400 leading-snug">
          {ponto
            ? t('chart.point', { o: ponto.rotulo, n: ponto.valor.toFixed(2), total: ponto.n })
            : t('chart.tapHint')}
        </p>
        <p className="text-right shrink-0">
          <span className="text-xl font-bold text-white tabular-nums">{ultimo.valor.toFixed(2)}</span>
          {usar.length > 1 && (
            <span className={`block text-[11px] tabular-nums ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(2)}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}
