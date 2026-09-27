// Builds a single self-contained HTML file (no service worker) for sharing a quick demo.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // PWA disabled here; it still provides the update module as a no-op.
  plugins: [react(), VitePWA({ disable: true, injectRegister: false }), viteSingleFile()],
  build: { outDir: 'dist-demo' },
})
