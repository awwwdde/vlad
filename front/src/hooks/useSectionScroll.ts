import { useEffect } from 'react'
import { useSectionCtx } from '@/context/SectionContext'

export function useSectionScroll() {
  const { current, goTo } = useSectionCtx()

  useEffect(() => {
    document.body.classList.add('home-page')
    return () => document.body.classList.remove('home-page')
  }, [])

  useEffect(() => {
    let lastWheel = 0
    const THROTTLE = 900

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = Date.now()
      if (now - lastWheel < THROTTLE) return
      lastWheel = now
      if (e.deltaY > 30) goTo(current + 1)
      if (e.deltaY < -30) goTo(current - 1)
    }

    let touchY = 0
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = touchY - e.changedTouches[0].clientY
      if (Math.abs(diff) < 60) return
      if (diff > 0) goTo(current + 1)
      else goTo(current - 1)
    }

    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown'].includes(e.key)) goTo(current + 1)
      if (['ArrowUp', 'PageUp'].includes(e.key)) goTo(current - 1)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [current, goTo])
}
