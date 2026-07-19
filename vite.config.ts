import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'To Do Bank',
        short_name: 'To Do Bank',
        description: '完成待辦，存進撲滿——自我獎勵待辦系統',
        lang: 'zh-TW',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#00804F',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
})
