'use client'

import { useEffect, useRef } from 'react'
import { CAT_FRAMES } from './catSprite'

export function RunningCat({ still, finish }: { still: boolean; finish: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current, parent = canvas?.parentElement, ctx = canvas?.getContext('2d')
    if (!canvas || !parent || !ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const stationary = still || reduced.matches
    let width = 1, height = 1, frame = 0, lastPose = -1
    const start = performance.now(), duration = stationary ? 3000 : 6800
    const atlas = document.createElement('canvas'), atlasContext = atlas.getContext('2d')
    if (!atlasContext) return
    const draw = (seconds: number) => {
      const index = stationary ? 0 : Math.floor(seconds * 12) % CAT_FRAMES.length
      if (index === lastPose) return
      lastPose = index
      ctx.clearRect(0, 0, width, height)
      ctx.drawImage(atlas, index * canvas.width, 0, canvas.width, canvas.height, 0, 0, width, height)
      canvas.dataset.phase = String(index)
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 1.5)
      width = rect.width; height = rect.height; canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      atlas.width = canvas.width * CAT_FRAMES.length; atlas.height = canvas.height
      atlasContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cell = Math.min(width / 37, height / 25), ox = (width - 37 * cell) / 2, oy = (height - 25 * cell) / 2
      atlasContext.font = `bold ${cell * 1.38}px monospace`; atlasContext.textAlign = 'center'; atlasContext.textBaseline = 'middle'
      CAT_FRAMES.forEach((rows,index)=>rows.forEach((row,y)=>Array.from(row).forEach((char,x)=>{
        if(char===' ') return
        atlasContext.fillStyle = char==='+' ? '#b3aa91' : '#f0d9ae'
        atlasContext.fillText(char,index * canvas.width / dpr + ox + (x+.5)*cell,oy+(y+.5)*cell)
      })))
      lastPose = -1; draw(stationary ? 0 : (performance.now() - start) / 1000)
    }
    resize()
    const animation = stationary ? null : canvas.animate([
      { transform: `translate3d(${-width - 20}px,0,0)` },
      { transform: `translate3d(${parent.clientWidth + 20}px,0,0)` },
    ], { duration, easing: 'linear', fill: 'forwards' })
    const tick = (now: number) => {
      draw((now - start) / 1000)
      frame = requestAnimationFrame(tick)
    }
    if (!stationary) frame = requestAnimationFrame(tick)
    const end = window.setTimeout(finish, duration)
    const hide = () => { if (document.visibilityState === 'hidden') finish() }
    const observer = new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) finish() })
    observer.observe(parent)
    document.addEventListener('visibilitychange', hide)
    reduced.addEventListener('change', finish)
    return () => { animation?.cancel(); cancelAnimationFrame(frame); clearTimeout(end); observer.disconnect(); document.removeEventListener('visibilitychange', hide); reduced.removeEventListener('change', finish) }
  }, [still, finish])
  return <canvas ref={ref} aria-hidden data-running-cat="ascii-sprite" data-facing="right" className={`pointer-events-none absolute bottom-0 z-20 h-[140px] w-[240px] md:h-[180px] md:w-[310px] ${still ? 'left-1/2 -translate-x-1/2' : 'left-0'}`} />
}
