import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'awwwdde — websites with character',
    short_name: 'awwwdde',
    start_url: '/',
    display: 'browser',
    background_color: '#536d79',
    theme_color: '#536d79',
    icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  }
}
