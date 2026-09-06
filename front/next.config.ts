import type { NextConfig } from 'next'

// Прод: контейнер front крутит `node server.js` из standalone-сборки,
// Caddy проксирует apex-домен на front:3000 (см. deploy/Caddyfile).
// Dev: rewrites подменяют vite-прокси — /api и /healthz уходят в FastAPI.
const PANEL_ORIGIN = process.env.PANEL_ORIGIN ?? 'http://localhost:8000'

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  images: {
    // Плейсхолдеры превью проектов, пока в image_url не появятся реальные
    // скриншоты (см. lib/projectImage.ts).
    remotePatterns: [{ protocol: 'https', hostname: 'picsum.photos' }],
  },

  async rewrites() {
    // В проде /api/* до Next не доходит — его перехватывает Caddy. Правила
    // остаются как страховка на случай запуска без Caddy (локально, docker run).
    return [
      { source: '/api/:path*', destination: `${PANEL_ORIGIN}/api/:path*` },
      { source: '/healthz', destination: `${PANEL_ORIGIN}/healthz` },
    ]
  },
}

export default nextConfig
