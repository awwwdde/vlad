import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CursorProvider } from '@/context/CursorContext'
import { CustomCursor } from '@/components/CustomCursor'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Home from '@/pages/Home'
import Work from '@/pages/Work'
import ProjectDetail from '@/pages/ProjectDetail'
import About from '@/pages/About'
import './i18n'

import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLocation } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

function ScrollLayout({ children }: { children: React.ReactNode }) {
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

export default function App() {
  return (
    <CursorProvider>
      <BrowserRouter>
        <CustomCursor />
        <ScrollLayout>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/work"        element={<Work />} />
            <Route path="/work/:slug"  element={<ProjectDetail />} />
            <Route path="/about"       element={<About />} />
          </Routes>
        </ScrollLayout>
      </BrowserRouter>
    </CursorProvider>
  )
}
