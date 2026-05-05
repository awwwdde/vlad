import { useEffect } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'

export function useCursorMove(ref: RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (!ref.current) return

    const xTo = gsap.quickTo(ref.current, 'x', { duration: 0.12, ease: 'power3.out' })
    const yTo = gsap.quickTo(ref.current, 'y', { duration: 0.12, ease: 'power3.out' })
    const fn = (e: MouseEvent) => { xTo(e.clientX); yTo(e.clientY) }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])
}
