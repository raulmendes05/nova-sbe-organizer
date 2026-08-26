import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { I18nProvider } from './i18n/index.jsx'
import './index.css'

// ---------------------------------------------------------------------------
//  Atualizacao da app instalada
//
//  O service worker faz skipWaiting + clientsClaim, por isso a versao nova
//  assume o controlo assim que e descarregada — mas a pagina ja aberta
//  continua a correr os ficheiros antigos, e nada lhe dizia para recarregar.
//  Num PWA no ecra principal, que raramente e fechado, o aluno podia ficar
//  dias com uma versao antiga sem perceber porque.
//
//  O ouvinte so e instalado quando JA existe um service worker a controlar a
//  pagina: na primeira visita `controller` e null e o `controllerchange` do
//  primeiro registo dispararia um recarregamento desnecessario.
// ---------------------------------------------------------------------------
if ('serviceWorker' in navigator) {
  if (navigator.serviceWorker.controller) {
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return      // controllerchange pode disparar mais do que uma vez
      reloading = true
      window.location.reload()
    })
  }
  // Procura uma versao nova ao abrir e depois de hora a hora, para quem deixa
  // a app aberta em segundo plano durante dias.
  navigator.serviceWorker.ready.then((reg) => {
    reg.update().catch(() => {})
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
  }).catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
