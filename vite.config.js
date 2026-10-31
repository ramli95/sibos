import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base = nama repositori GitHub, karena aplikasi terbit di USERNAME.github.io/sibos/
const base = process.env.VITE_BASE || '/sibos/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['logo.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'SIBOS — Sistem Informasi Bantuan Operasional Sekolah',
        short_name: 'SIBOS',
        description: 'Pengelolaan dana BOSP UPT SPF SMP Negeri 19 Makassar',
        lang: 'id',
        theme_color: '#1E3A8A',
        background_color: '#1E3A8A',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { chunkSizeWarningLimit: 1500 },
})
