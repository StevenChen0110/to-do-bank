import path from 'node:path'
import type { IncomingMessage } from 'node:http'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fetchOgProduct } from './api/_ogCore'
import { buildJarvisFeed } from './api/_jarvisFeed'

// Serve /api/og during `vite dev` (the Vercel function isn't running locally),
// so pasting a product link works the same on localhost and in production.
function devOgApi(): Plugin {
  return {
    name: 'dev-og-api',
    configureServer(server) {
      server.middlewares.use('/api/og', async (req, res) => {
        const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url') ?? ''
        res.setHeader('content-type', 'application/json')
        if (!/^https?:\/\/.+/i.test(target)) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'invalid url' }))
          return
        }
        try {
          res.end(JSON.stringify(await fetchOgProduct(target)))
        } catch {
          res.statusCode = 502
          res.end(JSON.stringify({ error: 'fetch failed' }))
        }
      })
    },
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', (c) => {
      data += c
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        resolve({})
      }
    })
    req.on('error', () => resolve({}))
  })
}

// Serve /api/jarvis-feed during dev (real RSS + Gemini scoring), matching the
// Vercel function. Reads GEMINI_API_KEY from the loaded env (see below).
function devJarvisApi(): Plugin {
  return {
    name: 'dev-jarvis-api',
    configureServer(server) {
      server.middlewares.use('/api/jarvis-feed', async (req, res) => {
        res.setHeader('content-type', 'application/json')
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'method not allowed' }))
          return
        }
        const body = await readJsonBody(req)
        try {
          res.end(JSON.stringify(await buildJarvisFeed(body?.profile ?? {})))
        } catch (e) {
          res.end(JSON.stringify({ fallback: true, reason: String(e).slice(0, 120), items: [] }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env* (all vars, no prefix filter) so server-side dev middleware can
  // read GEMINI_API_KEY. Never exposed to the client — no VITE_ prefix.
  const env = loadEnv(mode, process.cwd(), '')
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
  if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL

  return {
  plugins: [
    react(),
    tailwindcss(),
    devOgApi(),
    devJarvisApi(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        // Stable identity — required so app stores / browsers don't treat a
        // start_url change as a different app.
        id: '/',
        name: 'To Do Bank — 完成待辦，存進撲滿',
        short_name: 'To Do Bank',
        description:
          '把每天的待辦變成存款：完成任務累積虛擬幣，兌換自己想要的獎勵。內建工作管理、習慣養成與每日情報簡報。',
        lang: 'zh-TW',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Graceful degradation for browsers without standalone support.
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        background_color: '#fafafa',
        theme_color: '#00804F',
        categories: ['productivity', 'lifestyle', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press / right-click app icon jump targets.
        shortcuts: [
          { name: '今天的工作', short_name: '工作', url: '/?tab=work', description: '打開工作區看今天該做什麼' },
          { name: '待辦', short_name: '待辦', url: '/?tab=todo', description: '規劃與完成待辦' },
          { name: '撲滿', short_name: '撲滿', url: '/?tab=dashboard', description: '查看存款與獎勵進度' },
        ],
      },
      workbox: {
        // Precache the app shell for installability + offline launch.
        // Live data (Supabase) is intentionally NOT cached, so it stays fresh.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'pwa-192x192.png', 'pwa-512x512.png'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  }
})
