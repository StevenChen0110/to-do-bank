import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Browser-extension (MV3) build. Reuses the full app via popup/sidepanel entries.
// Output → dist-extension/ (load unpacked). No PWA service worker here.
//   npm run build:ext
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  publicDir: 'extension', // copies manifest.json + icon-*.png into the build
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist-extension',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        sidepanel: path.resolve(__dirname, 'sidepanel.html'),
        panel: path.resolve(__dirname, 'panel.html'),
      },
    },
  },
})
