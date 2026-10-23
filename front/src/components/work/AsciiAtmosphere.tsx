'use client'

import { useEffect, useRef } from 'react'

/** A folded 3D surface with directional light, sampled into a fine ASCII field. */
export function AsciiAtmosphere() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current, canvas = host?.querySelector('canvas'), ctx = canvas?.getContext('2d')
    if (!host || !canvas || !ctx) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const fixed = new URLSearchParams(location.search).get('workTime')
    const sample = fixed !== null && Number.isFinite(Number(fixed)) ? Number(fixed) : null
    const chars = '.:~+*#%@', atlas = document.createElement('canvas'); atlas.width = chars.length * 20; atlas.height = 24
    const glyphs = atlas.getContext('2d')
    if (!glyphs) return
    glyphs.font = '20px monospace'; glyphs.textAlign = 'center'; glyphs.textBaseline = 'middle'; glyphs.fillStyle = '#426775'
    Array.from(chars).forEach((char, i) => glyphs.fillText(char, i * 20 + 10, 12))
    let w = 1, h = 1, dpr = 1, frame = 0, last = 0, time = 0, visible = false
    const paint = () => {
      const t = reduce.matches ? 0 : sample ?? time, cell = w < 700 ? 3.8 : 3.4
      const columns = Math.ceil(w / cell), rows = Math.ceil(h / cell)
      const depth = new Float32Array(columns * rows); depth.fill(-Infinity)
      const light = new Float32Array(columns * rows)
      for (let i = 0; i <= 260; i++) for (let j = 0; j <= 100; j++) {
        const u = (i / 260 - .5) * 3.2, v = (j / 100 - .5) * 2
        const fold = u * 2.5 + t * .12
        const x0 = u * 1.7, y0 = v * .63 + Math.sin(fold) * .25, z0 = Math.sin(fold) * .60 + v * Math.cos(fold) * .32
        const y = y0 * .68 - z0 * .73, z = y0 * .73 + z0 * .68
        const x = x0 * .97 + y * .24, ry = -x0 * .24 + y * .97
        const perspective = 4 / (4 - z * .2)
        const sx = Math.floor((w * .67 + x * w * .225 * perspective) / cell), sy = Math.floor((h * .35 + ry * h * .31 * perspective) / cell)
        if (sx < 0 || sy < 0 || sx >= columns || sy >= rows) continue
        const at = sy * columns + sx
        if (z > depth[at]) {
          depth[at] = z
          const slope = Math.cos(fold) * 1.5 - v * Math.sin(fold) * .8
          light[at] = .25 + .75 / Math.sqrt(1 + slope * slope)
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < depth.length; i++) {
        if (depth[i] === -Infinity) continue
        const x = i % columns * cell, y = Math.floor(i / columns) * cell
        const fade = Math.min(1, Math.max(0, (x / w - .14) * 3.5)) * Math.min(1, y / 100) * Math.min(1, Math.max(0, (h * .78 - y) / 110))
        const shade = light[i], glyph = Math.min(chars.length - 1, Math.floor(shade * chars.length))
        ctx.globalAlpha = fade * (.12 + shade * .38)
        ctx.drawImage(atlas, glyph * 20, 0, 20, 24, x, y, cell * 1.1, cell * 1.35)
      }
      host.dataset.ready = 'true'
    }
    const tick = (now: number) => {
      if (now - last > 1000 / 18) { time += Math.min((now - last) / 1000, .1); last = now; paint() }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (reduce.matches || sample !== null) paint()
      else if (visible && document.visibilityState === 'visible') { last = performance.now(); frame = requestAnimationFrame(tick) }
    }
    const resize = () => {
      w = host.clientWidth; h = host.clientHeight; dpr = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr)); paint()
    }
    const size = new ResizeObserver(resize), visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    size.observe(host); visibility.observe(host)
    document.addEventListener('visibilitychange', sync); reduce.addEventListener('change', sync)
    resize()
    return () => { cancelAnimationFrame(frame); size.disconnect(); visibility.disconnect(); document.removeEventListener('visibilitychange', sync); reduce.removeEventListener('change', sync) }
  }, [])
  return <div ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden"><canvas className="block h-full w-full" /></div>
}
