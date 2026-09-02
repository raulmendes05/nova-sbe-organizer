import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useT } from '../i18n/index.jsx'

/**
 * Visita guiada: escurece o ecrã, ilumina um elemento e põe-lhe uma caixa ao
 * lado com uma seta a apontar.
 *
 * Os passos dizem só QUAL é o elemento (`target`, um seletor CSS) e o que
 * dizer dele. O sítio da caixa sai da posição do elemento: no computador a
 * barra fica à esquerda e a caixa vai para o lado; no telemóvel a barra está
 * em baixo e a caixa sobe. Um passo cujo alvo não exista na página aparece ao
 * centro, sem seta — mais vale isso do que uma seta a apontar para o nada.
 */

// A mesma barra existe duas vezes no DOM (lateral e inferior); só uma está
// visível, e é a medida dela que interessa.
function alvoVisivel(seletor) {
  for (const el of document.querySelectorAll(seletor)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

const LARGURA = 300
const FOLGA = 14

export default function Tour({ steps, onFinish, onSkip, onAction }) {
  const { t } = useT()
  const [i, setI] = useState(0)
  const [rect, setRect] = useState(null)
  const [altura, setAltura] = useState(200)   // altura real da caixa
  const cartao = useRef(null)
  const passo = steps[i]

  useEffect(() => {
    if (!passo) return
    const medir = () => {
      const el = alvoVisivel(passo.target)
      setRect(el ? el.getBoundingClientRect() : null)
    }
    medir()
    // A barra lateral é sticky e a de baixo é fixa, mas a página por baixo
    // mexe-se — remedir é mais barato que adivinhar.
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    const timer = setInterval(medir, 500)
    return () => {
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
      clearInterval(timer)
    }
  }, [passo])

  useLayoutEffect(() => {
    const h = cartao.current?.offsetHeight
    if (h && Math.abs(h - altura) > 2) setAltura(h)
  })

  if (!passo) return null

  const vw = typeof window === 'undefined' ? 360 : window.innerWidth
  const vh = typeof window === 'undefined' ? 640 : window.innerHeight
  const largura = Math.min(LARGURA, vw - 32)

  // De que lado fica a caixa. A barra do telemóvel está colada ao fundo, por
  // isso essa decide-se primeiro: ao lado de um separador de 60px a caixa
  // ficava encostada à borda mesmo quando lá cabe.
  let lado = 'centro'
  if (rect) {
    if (rect.top > vh * 0.6) lado = 'cima'
    else if (vw - rect.right > largura + FOLGA * 2) lado = 'direita'
    else lado = 'baixo'
  }

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  let caixa = { left: (vw - largura) / 2, top: Math.max(16, vh / 2 - altura / 2) }
  if (rect && lado === 'direita') {
    caixa = { left: rect.right + FOLGA, top: clamp(rect.top + rect.height / 2 - altura / 2, 16, Math.max(16, vh - altura - 16)) }
  } else if (rect && lado === 'cima') {
    caixa = { left: clamp(rect.left + rect.width / 2 - largura / 2, 16, Math.max(16, vw - largura - 16)), top: Math.max(16, rect.top - altura - FOLGA) }
  } else if (rect && lado === 'baixo') {
    caixa = { left: clamp(rect.left + rect.width / 2 - largura / 2, 16, Math.max(16, vw - largura - 16)), top: rect.bottom + FOLGA }
  }

  // Seta: um quadrado rodado encostado ao lado da caixa virado para o alvo.
  const centroAlvo = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null
  const seta = !rect || lado === 'centro' ? null
    : lado === 'direita'
      ? { left: -5, top: clamp(centroAlvo.y - caixa.top - 5, 12, Math.max(12, altura - 22)) }
      : lado === 'cima'
        ? { left: clamp(centroAlvo.x - caixa.left - 5, 12, largura - 22), bottom: -5 }
        : { left: clamp(centroAlvo.x - caixa.left - 5, 12, largura - 22), top: -5 }

  const ultimo = i === steps.length - 1

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      {/* Apanha os cliques: durante a visita não se anda a clicar por baixo */}
      <div className="absolute inset-0" />

      {rect ? (
        <div className="absolute rounded-2xl pointer-events-none transition-all duration-200"
          style={{
            left: rect.left - 6, top: rect.top - 6,
            width: rect.width + 12, height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(3, 8, 18, 0.78)',
            outline: '2px solid rgba(125, 183, 255, 0.9)',
          }} />
      ) : (
        <div className="absolute inset-0 bg-[#030812]/78" />
      )}

      <div ref={cartao} className="absolute rounded-2xl bg-[#0d1626] border border-white/12 shadow-card p-4"
        style={{ left: caixa.left, top: caixa.top, width: largura }}>
        {seta && (
          <span className="absolute w-2.5 h-2.5 rotate-45 bg-[#0d1626] border-l border-t border-white/12"
            style={{ ...seta, transform: `rotate(${lado === 'cima' ? 225 : lado === 'baixo' ? 45 : 315}deg)` }} />
        )}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-nova-300/80">
          {t('tour.step', { n: i + 1, total: steps.length })}
        </p>
        <p className="text-base font-bold text-white mt-1">{t(passo.title)}</p>
        <p className="text-sm text-slate-300 leading-relaxed mt-1.5">{t(passo.body)}</p>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={onSkip} className="text-xs text-slate-500 hover:text-slate-300 px-1 py-2">
            {t('tour.skip')}
          </button>
          <div className="flex-1" />
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="btn-ghost px-3 py-2 text-sm">{t('tour.back')}</button>
          )}
          {ultimo ? (
            <button onClick={onAction} className="btn-primary px-4 py-2 text-sm">{t('tour.start')}</button>
          ) : (
            <button onClick={() => setI(i + 1)} className="btn-primary px-4 py-2 text-sm">{t('tour.next')}</button>
          )}
        </div>
        {ultimo && (
          <button onClick={onFinish} className="w-full text-center text-xs text-slate-500 hover:text-slate-300 mt-2 py-1">
            {t('tour.later')}
          </button>
        )}
      </div>
    </div>
  )
}
