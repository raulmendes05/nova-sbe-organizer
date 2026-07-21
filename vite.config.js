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
            const { messages, context } = JSON.parse(body || '{}')
            const { runClaudio } = await import('./api/_core.js')
            const result = await runClaudio({ messages, context, apiKey: key })
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      claudioDevApi(env),
      examUrlDevApi(env),
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
