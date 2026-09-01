import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Middleware que serve /api/claudio em desenvolvimento (o `vite dev` não corre
// as funções serverless da Vercel). Em produção, a Vercel usa api/claudio.js.
function claudioDevApi(env) {
  return {
    name: 'claudio-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/claudio', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Método não permitido')
          return
        }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          res.setHeader('content-type', 'application/json')
          try {
            const key = env.GEMINI_API_KEY
            if (!key) {
              res.statusCode = 500
              res.end(JSON.stringify({ error: 'Falta GEMINI_API_KEY no .env.local' }))
              return
            }
            const { messages, context, lang } = JSON.parse(body || '{}')
            const { runClaudio } = await import('./api/_core.js')
            const result = await runClaudio({ messages, context, lang, apiKey: key })
            res.statusCode = 200
            res.end(JSON.stringify(result))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e?.message || 'Erro inesperado.' }))
          }
        })
      })
    },
  }
}

// Idem para /api/exam-url (URLs assinados do R2 das provas antigas).
function examUrlDevApi(env) {
  return {
    name: 'exam-url-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/exam-url', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Método não permitido')
          return
        }
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          res.setHeader('content-type', 'application/json')
          try {
            const token = (req.headers.authorization || '').replace(/^Bearer /i, '')
            const { signExamUrl } = await import('./api/_r2.js')
            const out = await signExamUrl({ ...JSON.parse(body || '{}'), token, env })
            res.statusCode = 200
            res.end(JSON.stringify(out))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e?.message || 'Erro inesperado.' }))
          }
        })
      })
    },
  }
}

// Idem para /api/horario (leitura da captura do horario do NETPA).
function horarioDevApi(env) {
  return {
    name: 'horario-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/horario', (req, res) => {
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', async () => {
          const fake = {
            method: req.method,
            body: (() => { try { return JSON.parse(body || '{}') } catch { return {} } })(),
          }
          const out = {
            statusCode: 200,
            status(c) { this.statusCode = c; return this },
            json(v) {
              res.statusCode = this.statusCode
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(v))
            },
          }
          // A chave nao esta no process.env do vite dev — vem do .env.local.
          process.env.GEMINI_API_KEY ||= env.GEMINI_API_KEY || ''
          const { default: handler } = await import('./api/horario.js')
          await handler(fake, out)
        })
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
  const built = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return {
    // Mostrados no Perfil — permitem distinguir a versao carregada da que
    // esta publicada, quando o service worker do PWA serve uma cache antiga.
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __APP_BUILD__: JSON.stringify(built),
    },
    plugins: [
      react(),
      claudioDevApi(env),
      examUrlDevApi(env),
      horarioDevApi(env),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Nova SBE Organizer',
          short_name: 'Nova SBE',
          description: 'Organiza o teu horario, prazos, notas e tarefas na Nova SBE',
          theme_color: '#0a2540',
          background_color: '#0a2540',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          // Atalhos do ícone (long-press no ícone da app instalada)
          shortcuts: [
            {
              name: 'Próxima aula', short_name: 'Próxima',
              description: 'A próxima aula e a sala',
              url: '/proxima',
              icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
            {
              name: 'Horário', short_name: 'Horário',
              url: '/horario',
              icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }],
            },
          ],
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    server: {
      port: 5173,
      open: true,
    },
  }
})
