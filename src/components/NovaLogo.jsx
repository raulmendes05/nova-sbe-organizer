// Marca Nova SBE — recriada em SVG (sem depender de ficheiros externos).
// O símbolo é o "O" da Nova: anel aberto no topo com um ponto por cima.

// Só o símbolo (o "O"), para usar solto.
export function NovaMark({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="150 76 212 262" className={className} aria-hidden="true"
      fill="none" stroke="currentColor" strokeWidth="40" strokeLinecap="round">
      {/* anel quase fechado: só uma pequena falha no topo, sob o ponto */}
      <path d="M 281.9 144.1 A 84 84 0 1 1 230.1 144.1" />
      <circle cx="256" cy="104" r="25" fill="currentColor" stroke="none" />
    </svg>
  )
}

// Logótipo completo: "N O VA" + assinatura, como no material oficial.
export default function NovaLogo({ className = '' }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex items-center text-white font-extrabold tracking-tight leading-none"
        style={{ fontSize: '1.6rem' }}>
        <span>N</span>
        <NovaMark className="w-[1.15em] h-[1.15em] -mx-[0.06em]" />
        <span>VA</span>
      </div>
      <p className="mt-1.5 text-[7.5px] font-semibold uppercase tracking-[0.18em] text-slate-400 text-center leading-tight">
        School of Business<br />&amp; Economics
      </p>
    </div>
  )
}
