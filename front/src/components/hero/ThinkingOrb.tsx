'use client'

import { useEffect, useRef } from 'react'

/** A small, lit, rippling 3D surface rasterised to ASCII cells. */
export function ThinkingOrb() {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const host = ref.current, canvas = host?.querySelector('canvas'), ctx = canvas?.getContext('2d')
    if (!host || !canvas || !ctx) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const fixed = new URLSearchParams(location.search).get('orbTime')
    const sample = fixed !== null && Number.isFinite(Number(fixed)) ? Number(fixed) : null
    let size = 1, dpr = 1, frame = 0, last = 0, time = 0, visible = false, disposed = false, draws = 0
    const chars = '.:+*#@', atlas = document.createElement('canvas')
    atlas.width = chars.length * 20; atlas.height = 24
    const glyphs = atlas.getContext('2d')
    if (!glyphs) return
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size)
      const t = reduce.matches ? 0 : sample ?? time
      const cells = Math.max(14, Math.ceil(size / 2)), step = size / cells
      const depth = new Float32Array(cells * cells); depth.fill(-Infinity)
      const light = new Float32Array(cells * cells)
      const yaw = t * .22, cy = Math.cos(yaw), sy = Math.sin(yaw)
      for (let row = 1; row < 35; row++) {
        const theta = row / 35 * Math.PI
        for (let col = 0; col < 64; col++) {
          const phi = col / 64 * Math.PI * 2
          const r = 1 + .09 * Math.sin(phi * 3 + theta * 2 + t * .85) + .055 * Math.sin(theta * 5 - phi * 2 - t * .65)
          const px = Math.sin(theta) * Math.cos(phi), py = Math.cos(theta), pz = Math.sin(theta) * Math.sin(phi)
          const x = px * cy + pz * sy, z = -px * sy + pz * cy
          const perspective = 3 / (3 - z * .16)
          const sx = Math.floor(cells * (.5 + x * r * perspective * .39)), syCell = Math.floor(cells * (.5 + py * r * perspective * .39))
          if (sx < 0 || syCell < 0 || sx >= cells || syCell >= cells) continue
          const address = syCell * cells + sx
          if (z * r > depth[address]) {
            depth[address] = z * r
            const bands = .84 + .16 * Math.sin(theta * 11 + phi * 2 + t * .6)
            light[address] = Math.max(.08, Math.min(1, (.28 + Math.max(0, -x * .4 - py * .3 + z * .7) * .8) * bands))
          }
        }
      }
      for (let i = 0; i < depth.length; i++) {
        if (depth[i] === -Infinity) continue
        const shade = light[i], glyph = Math.min(chars.length - 1, Math.floor(shade * chars.length))
        ctx.globalAlpha = .3 + shade * .7
        ctx.drawImage(atlas, glyph * 20, 0, 20, 24, (i % cells) * step - step * .1, Math.floor(i / cells) * step - step * .15, step * 1.2, step * 1.4)
      }
      host.dataset.ready = 'true'; host.dataset.frame = String(++draws); host.dataset.time = t.toFixed(3)
    }
    const tick = (now: number) => {
      if (disposed) return
      if (now - last >= 1000 / 30) { time += Math.min((now - last) / 1000, .1); last = now; draw() }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (reduce.matches || sample !== null) draw()
      else if (visible && document.visibilityState === 'visible') { last = performance.now(); frame = requestAnimationFrame(tick) }
    }
    const resize = () => {
      size = Math.max(1, host.getBoundingClientRect().width); dpr = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(size * dpr); canvas.height = Math.round(size * dpr)
      glyphs.clearRect(0, 0, atlas.width, atlas.height)
      glyphs.font = '20px monospace'; glyphs.textAlign = 'center'; glyphs.textBaseline = 'middle'; glyphs.fillStyle = getComputedStyle(host).color
      Array.from(chars).forEach((char, i) => glyphs.fillText(char, i * 20 + 10, 12))
      draw()
    }
    const observer = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(host); intersection.observe(host)
    document.addEventListener('visibilitychange', sync); reduce.addEventListener('change', sync)
    resize()
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect()
      document.removeEventListener('visibilitychange', sync); reduce.removeEventListener('change', sync)
    }
  }, [])
  return <span ref={ref} data-thinking-orb aria-hidden="true" className="group/orb relative mx-[.10em] inline-block size-[.78em] align-[-.10em] text-[#f0d6a3]">
    <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full opacity-60 group-data-[ready=true]/orb:hidden"><circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 2" /></svg>
    <canvas className="absolute inset-0 block h-full w-full" />
  </span>
}
