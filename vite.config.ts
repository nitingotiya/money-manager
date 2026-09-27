import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    VitePWA({
      // 'prompt': the new version downloads in the background and the app shows "Update now".
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg'],
      workbox: { clientsClaim: true, cleanupOutdatedCaches: true },
      manifest: {
        name: 'Money Manager',
        short_name: 'Money',
        description: 'Track expenses, budgets, savings goals and bills.',
        theme_color: '#0f766e',
        background_color: '#f6f7f5',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
