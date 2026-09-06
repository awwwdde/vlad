import type { Metadata, Viewport } from 'next'
import { Onest, JetBrains_Mono, Manrope } from 'next/font/google'
import '@/index.css'
import { Providers } from './providers'

// next/font: шрифты self-hosted и preload-ятся, без внешнего запроса к Google
// в рантайме (он же был причиной сдвига макета на первой отрисовке).
const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-onest',
  display: 'swap',
})

// Шапка и подписи героя набраны Manrope: у него узкие пропорции и ровный
// ритм в мелком кегле, а именно там эти строки и живут.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://awwwdde.art'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'awwwdde. Веб-разработка и интерфейсы',
    template: '%s. awwwdde',
  },
  description:
    'Проектирую и собираю сайты: от прототипа до продакшена. React, Next.js, интерфейсы, которые работают на задачу.',
  icons: { icon: '/favicon.svg' },
  verification: { yandex: 'd19150c146b0f019' },
  openGraph: {
    type: 'website',
    siteName: 'awwwdde',
    url: SITE_URL,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafaf9' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c0d' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${onest.variable} ${manrope.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
