import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // В dev фронт крутится на :5173, а панель на :8000 — прокидываем /api и
  // /healthz, чтобы запросы из админки не упирались в CORS/абсолютные URL.
  // В проде Caddy делает то же самое (см. deploy/Caddyfile).
  server: {
    proxy: {
      '/api':     { target: 'http://localhost:8000', changeOrigin: true },
      '/healthz': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
