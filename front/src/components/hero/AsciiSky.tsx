'use client'

import { useEffect, useRef } from 'react'
import { SkyRenderer } from './skyRenderer'
import { flagBool, useSiteSettings } from '@/hooks/useSiteSettings'

export function AsciiSky() {
  const animated = flagBool(useSiteSettings(), 'sky_animated', true)
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const context = canvas.getContext('webgl2', { alpha: false, antialias: false })
    if (!context) {
      canvas.dataset.skyState = 'fallback'
      return
    }
    // Repeatable visual inspection: ?skyTime=12&skyView=tone.
    const params = new URLSearchParams(location.search)
    const requestedTime = params.has('skyTime') ? Number(params.get('skyTime')) : NaN
    const fixedTime = Number.isFinite(requestedTime) ? Math.max(0, requestedTime) : null
    const toneOnly = params.get('skyView') === 'tone'
    let renderer: SkyRenderer | null = null
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const initialRect = canvas.getBoundingClientRect()
    let inView = initialRect.bottom > 0 && initialRect.top < innerHeight
    let disposed = false
    let frame = 0
    let last = 0
    let lastDraw = 0
    let elapsed = 0
    let frames = 0
    let sampleStart = 0, sampleFrames = 0

    const draw = () => {
      if (disposed) return
      const now = performance.now()
      // Keep motion at real-time speed even when rendering drops frames.
      // sync() resets last after a visibility/intersection pause.
      elapsed += Math.max(0, (now - last) / 1000)
      last = now
      if (renderer && now - lastDraw >= renderer.frameInterval - .5) {
        const started = performance.now()
        renderer.draw(elapsed, toneOnly)
        lastDraw = now - ((now - lastDraw) % renderer.frameInterval)
        sampleFrames++
        if (now - sampleStart >= 1000) {
          canvas.dataset.skyFps = (sampleFrames * 1000 / (now - sampleStart)).toFixed(1)
          sampleStart = now; sampleFrames = 0
        }
        if (++frames % 12 === 0) {
          canvas.dataset.skyTime = elapsed.toFixed(2)
          canvas.dataset.skyFrame = String(frames)
          canvas.dataset.skySubmitMs = (performance.now() - started).toFixed(2)
        }
      }
      frame = requestAnimationFrame(draw)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (!renderer) return
      canvas.dataset.skyState = fixedTime !== null ? 'fixed' : motion.matches ? 'reduced' : 'paused'
      if (inView && document.visibilityState === 'visible' && !motion.matches && animated && fixedTime === null) {
        canvas.dataset.skyState = 'running'
        last = performance.now()
        sampleStart = last; sampleFrames = 0; lastDraw = last - renderer.frameInterval
        frame = requestAnimationFrame(draw)
      }
    }
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      renderer?.resize(width, height, devicePixelRatio || 1)
      const renderTime = fixedTime ?? (motion.matches ? 0 : elapsed)
      renderer?.draw(renderTime, toneOnly)
      canvas.dataset.skyTime = renderTime.toFixed(2)
    }
    const initialize = () => {
      try {
        renderer = new SkyRenderer(canvas, context)
        canvas.style.opacity = '1'
        resize()
        sync()
      } catch (error) {
        renderer?.dispose()
        renderer = null
        canvas.style.opacity = '0'
        canvas.dataset.skyState = 'fallback'
        console.warn('Could not initialize the ASCII sky', error)
      }
    }
    const onContextLost = (event: Event) => {
      event.preventDefault()
      cancelAnimationFrame(frame)
      renderer = null
      canvas.style.opacity = '0'
      canvas.dataset.skyState = 'fallback'
    }
    const onMotion = () => { resize(); sync() }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync() })
    intersection.observe(canvas)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', onMotion)
    canvas.addEventListener('webglcontextlost', onContextLost)
    canvas.addEventListener('webglcontextrestored', initialize)
    initialize()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', onMotion)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', initialize)
      renderer?.dispose()
    }
  }, [animated])
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}
