import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { CursorProvider } from '@/context/CursorContext'
import { CustomCursor } from '@/components/CustomCursor'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Home from '@/pages/Home'
import Work from '@/pages/Work'
import ProjectDetail from '@/pages/ProjectDetail'
import About from '@/pages/About'
import './i18n'

import { useEffect, lazy, Suspense } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Админка лениво — публичный сайт не тащит её код, пока никто не зайдёт на /admin.
const AdminApp = lazy(() => import('@/admin/AdminApp'))

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

// Роутер верхнего уровня: /admin/* выпадает в свой собственный layout без
// курсора/хедера/футера/Lenis — у админки своя эстетика и свой UX.
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
      <Route
        path="/*"
        element={
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
        }
      />
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
