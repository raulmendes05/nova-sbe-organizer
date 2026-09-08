import { termStatus } from '../lib/terms.js'
import { useT } from '../i18n/index.jsx'

// O tom diz o que a etiqueta sozinha nao dizia: se a cadeira e para agora.
// Azul = esta a decorrer; apagado = ainda nao comecou ou ja acabou.
const TONES = {
  agora: 'bg-nova-500/25 text-nova-100 border-nova-400/40',
  antes: 'bg-white/[0.06] text-slate-400 border-white/15',
  depois: 'bg-white/[0.06] text-slate-500 border-white/10',
}

/**
 * "T1" / "T2" — em que metade do semestre e que esta cadeira corre.
 *
 * Nao aparece nada para as cadeiras de semestre inteiro ('S1') nem quando nao
 * se sabe: a etiqueta so vale a pena onde ha mesmo duas hipoteses.
 */
export default function TermBadge({ term, className = '' }) {
  const { t } = useT()
  const estado = termStatus(term)
  if (!estado) return null
  return (
    <span
      title={t(`term.half.${estado}`, { term })}
      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide ${TONES[estado]} ${className}`}>
      {term}
    </span>
  )
}
