'use client'

import { useEffect, useRef } from 'react'
import { ribbonGeometry, signalGeometry, type Shape } from './sculptureGeometry'
import { flagBool, useSiteSettings } from '@/hooks/useSiteSettings'

export function AsciiSculpture({ shape = 'ribbon', dark = false, motionSetting }: { shape?: Shape; dark?: boolean; motionSetting?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const settings = useSiteSettings()
  const animated = flagBool(settings, motionSetting ?? (shape === 'ribbon' ? 'about_model_animated' : 'contact_model_animated'), true)
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'), params = new URLSearchParams(location.search)
    const fixed = params.has('sculptureTime') && Number.isFinite(Number(params.get('sculptureTime'))) ? Number(params.get('sculptureTime')) : null
    const vertices = shape === 'ribbon' ? ribbonGeometry() : signalGeometry()
    let width = 1, height = 1, cols = 1, rows = 1, step = 1, dpr = 1, time = 0, frame = 0, last = 0, visible = false, frames = 0
    let depth = new Float32Array(1), colors = new Int16Array(1), glyph = new Int16Array(1)
    const ramp = '.:+*oO0#%@', atlas = document.createElement('canvas'); atlas.width = ramp.length * 16; atlas.height = 24 * 20
    const ink = atlas.getContext('2d')!
    ink.font = 'bold 18px monospace'; ink.textAlign = 'center'; ink.textBaseline = 'middle'
    const palettes = dark ? [[135, 201, 215], [191, 170, 229], [242, 206, 142]] : [[51, 109, 132], [108, 92, 150], [168, 126, 65]]
    palettes.forEach((rgb, family) => { for (let light = 0; light < 8; light++) {
      const level = family * 8 + light, f = light / 7
      ink.fillStyle = `rgb(${rgb.map(n => Math.round(dark ? n * (.7 + f * .3) + f * 8 : n * (.55 + f * .45))).join(',')})`
      Array.from(ramp).forEach((char, index) => ink.fillText(char, index * 16 + 8, level * 20 + 10))
    } })
    const paint = () => {
      const started = performance.now(), t = reduced.matches || !animated ? 0 : fixed ?? time
      depth.fill(-Infinity); colors.fill(-1)
      const yaw = shape === 'ribbon' ? .5 + t * .24 : Math.sin(t * .28) * .48
      const pitch = shape === 'ribbon' ? .72 + Math.sin(t * .16) * .12 : .10 + Math.sin(t * .21) * .12
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch)
      const scale = Math.min(cols, rows * 1.15) * (shape === 'ribbon' ? .30 : .28)
      for (const p of vertices) {
        const yy = p.y * cx - p.z * sx, zz = p.y * sx + p.z * cx
        const x = p.x * cy + zz * sy, z = -p.x * sy + zz * cy, perspective = 4 / (4 - z * .2)
        const px = Math.floor(cols / 2 + x * scale * perspective), py = Math.floor(rows / 2 + yy * scale / 1.15 * perspective)
        if (px < 0 || py < 0 || px >= cols || py >= rows) continue
        const at = py * cols + px
        if (z <= depth[at]) continue
        depth[at] = z
        const ny = p.ny * cx - p.nz * sx, nz0 = p.ny * sx + p.nz * cx, nx = p.nx * cy + nz0 * sy, nz = -p.nx * sy + nz0 * cy
        const light = Math.min(1, .25 + Math.abs(-nx * .35 - ny * .45 + nz * .8) * .75)
        const film = Math.sin(nx * 3.4 + nz * 2.3 + t * .32) * .5 + .5
        colors[at] = Math.min(2, Math.floor(film * 3)) * 8 + Math.min(7, Math.floor(light * 8))
        glyph[at] = Math.min(9, Math.floor(light * 9))
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height)
      const ox = (width - cols * step) / 2, oy = (height - rows * step * 1.15) / 2
      for (let at = 0; at < colors.length; at++) if (colors[at] >= 0) ctx.drawImage(atlas, glyph[at] * 16, colors[at] * 20, 16, 20, ox + at % cols * step, oy + Math.floor(at / cols) * step * 1.15, step * 1.22, step * 1.42)
      canvas.dataset.frame = String(++frames); canvas.dataset.renderMs = (performance.now() - started).toFixed(2); canvas.dataset.state = reduced.matches ? 'reduced' : !animated || fixed !== null ? 'fixed' : 'running'
    }
    const tick = (now: number) => {
      if (now - last >= 1000 / 30 - .5) { const delta = (now - last) / 1000; last = now; time += delta; paint() }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (reduced.matches || !animated || fixed !== null) paint()
      else if (visible && document.visibilityState === 'visible') { last = performance.now(); frame = requestAnimationFrame(tick) }
      else canvas.dataset.state = 'paused'
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height); dpr = Math.min(devicePixelRatio || 1, 1.25)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      step = Math.max(3, width / 116, height / 100 / 1.15); cols = Math.max(1, Math.floor(width / step)); rows = Math.max(1, Math.floor(height / (step * 1.15)))
      depth = new Float32Array(cols * rows); colors = new Int16Array(cols * rows); glyph = new Int16Array(cols * rows); paint()
    }
    const observer = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(canvas); intersection.observe(canvas); document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync); resize()
    return () => { cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync) }
  }, [shape, dark, animated])
  return <canvas ref={ref} data-ascii-sculpture={shape} aria-hidden className="block h-full w-full" />
}
