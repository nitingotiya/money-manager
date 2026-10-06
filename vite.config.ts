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
        id: './',
        name: 'Money Manager',
        short_name: 'Money',
        description: 'Track expenses, budgets, savings goals, bills and money friends owe you.',
        lang: 'en-IN',
        theme_color: '#f6f7f5',
        // Splash screen shown while the installed app starts
        background_color: '#0f766e',
        display: 'standalone',
        display_override: ['standalone'],
        orientation: 'portrait',
        start_url: '.',
        scope: '.',
        categories: ['finance', 'productivity'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the app icon on the home screen to jump straight to these
        shortcuts: [
          { name: 'Add transaction', short_name: 'Add', url: './?action=add#/', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
          { name: 'Lending & EMIs', short_name: 'Lending', url: './#/lending', icons: [{ src: 'icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
})
