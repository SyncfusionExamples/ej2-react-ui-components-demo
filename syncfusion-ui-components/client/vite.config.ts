import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// Syncfusion theme CSS files start with a blocking `@import url(https://fonts.googleapis.com/...)`.
// It is repeated in every component stylesheet and breaks lazy-loaded pages when Google Fonts
// is unreachable (offline / corporate proxy). Strip it; index.html loads Inter once, non-blocking.
const REMOTE_FONT_IMPORT = /@import\s+(?:url\(\s*)?(["'])https?:\/\/fonts\.googleapis\.com.*?\1\s*\)?\s*;?|@import\s+url\(\s*https?:\/\/fonts\.googleapis\.com[^)]*\)\s*;?/g

function stripRemoteFontImports(): Plugin {
  return {
    name: 'strip-remote-font-imports',
    enforce: 'post',
    // dev server + build: runs after Vite has inlined the CSS @imports
    transform(code, id) {
      if (!/\.css($|\?)/.test(id) || !code.includes('fonts.googleapis.com')) return null
      return { code: code.replace(REMOTE_FONT_IMPORT, ''), map: null }
    },
    // build safety net for emitted .css assets
    generateBundle(_, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css') && typeof file.source === 'string') {
          file.source = file.source.replace(REMOTE_FONT_IMPORT, '')
        }
      }
    },
  }
}

// API calls to /api are proxied to the Express mock server (server/ folder).
export default defineConfig({
  base: '/ej2-ui-components/',
  plugins: [stripRemoteFontImports(), react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
  build: { outDir: 'dist/public', chunkSizeWarningLimit: 2500 },
})
