import { createContext, useContext } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { pt } from './pt.js'
import { en } from './en.js'

export const LANGS = [
  { v: 'pt', label: 'Português', flag: '🇵🇹' },
  { v: 'en', label: 'English', flag: '🇬🇧' },
]

const DICTS = { pt, en }
export const DEFAULT_LANG = 'pt'

const I18nContext = createContext({ lang: DEFAULT_LANG, t: (k) => k })

/**
 * Tradução da app. Vive dentro do AuthProvider porque o idioma é uma
 * preferência da conta (metadados do utilizador) — assim segue o aluno entre
 * o telemóvel e o computador.
 *
 * A migração é incremental: uma chave que ainda não exista no dicionário do
 * idioma escolhido cai para o português, e uma chave que não exista de todo
 * devolve a própria chave (fica visível em desenvolvimento, sem rebentar).
 */
export function I18nProvider({ children }) {
  const { lang } = useAuth()
  const dict = DICTS[lang] || pt

  function t(key, vars) {
    let s = dict[key] ?? pt[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
    }
    return s
  }

  return <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>
}

export const useT = () => useContext(I18nContext)
