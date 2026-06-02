import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { CursorProvider } from '@/context/CursorContext'
import { CustomCursor } from '@/components/CustomCursor'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Home from '@/pages/Home'
import Work from '@/pages/Work'
import ProjectDetail from '@/pages/ProjectDetail'
import About from '@/pages/About'
import ComingSoon from '@/pages/ComingSoon'
import './i18n'

import { useEffect, useState, lazy, Suspense } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useSiteSettings, flagBool } from '@/hooks/useSiteSettings'

gsap.registerPlugin(ScrollTrigger)

// Админка лениво — публичный сайт не тащит её код, пока никто не зайдёт на /admin.
const AdminApp = lazy(() => import('@/admin/AdminApp'))

// ── Coming Soon-гейт ────────────────────────────────────────────────────────
// Управляется из админки (Site Settings → coming_soon=true|false), без пересборки фронта.
// Bypass для тебя как админа:
//   1. URL `?preview` — сохраняется в localStorage.
//   2. Заход в /admin/login — авто-выставляет bypass при успехе.
const BYPASS_KEY = 'awwwdde_preview_bypass'

function usePreviewBypass(): boolean {
  const [bypass] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.has('preview')) {
        window.localStorage.setItem(BYPASS_KEY, '1')
        const cleanUrl = window.location.pathname + window.location.hash
        window.history.replaceState(null, '', cleanUrl)
        return true
      }
      return window.localStorage.getItem(BYPASS_KEY) === '1'
    } catch {
      return false
    }
  })
  return bypass
}

function PublicShell({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isFullscreen = pathname === '/' || pathname === '/about'

  useEffect(() => {
    if (isFullscreen) return

    const lenis = new Lenis({
      duration: 1.3,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => { lenis.destroy(); gsap.ticker.remove(tick) }
  }, [isFullscreen])

  if (isFullscreen) return <>{children}</>

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

function PublicRoutes() {
  const bypass = usePreviewBypass()
  const settings = useSiteSettings()
  const comingSoon = flagBool(settings, 'coming_soon', false)

  // НЕ блокируем рендер на null — иначе при недоступном беке (локальный dev
  // без uvicorn, network error) сайт зависает на белом экране. flagBool
  // принимает null и отдаёт дефолт; если ComingSoon включён, пользователь
  // увидит главную на ~200ms и потом переключение — это лучше, чем «всё
  // умерло». Bypass-кука стабилизирует ситуацию для тебя сразу.

  if (comingSoon && !bypass) {
    return <ComingSoon />
  }

  return (
    <CursorProvider>
      <CustomCursor />
      <PublicShell>
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/work"        element={<Work />} />
          <Route path="/work/:slug"  element={<ProjectDetail />} />
          <Route path="/about"       element={<About />} />
        </Routes>
      </PublicShell>
    </CursorProvider>
  )
}

// Роутер верхнего уровня: /admin/* всегда доступен (минуя coming-soon),
// /* проходит через гейт.
function Router() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-400">
                Загрузка админки…
              </div>
            }
          >
            <AdminApp />
          </Suspense>
        }
      />
      <Route path="/*" element={<PublicRoutes />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  )
}
