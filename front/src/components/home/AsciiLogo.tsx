'use client'

import { useEffect, useRef } from 'react'
import { cubicBezier } from 'framer-motion'
import { Logo } from '@/components/Logo'
import { clamp, makeVolume } from './journeyGeometry'
import { LogoRotation } from '@/lib/logoRotation'

type Mark = { x: number; y: number; width: number }
type Particle = { x: number; y: number; glyph: number; alpha: number; seed: number; delay: number }
const easeInOut = cubicBezier(.77, 0, .175, 1)
const random = (n: number) => { const value = Math.sin(n * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }

export function AsciiLogo({ journey = false }: { journey?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current, canvas = host?.querySelector('canvas'), ctx = canvas?.getContext('2d')
    if (!host || !canvas || !ctx) return
    const volume = makeVolume()
    const root = journey ? host.closest<HTMLElement>('[data-work-journey]') : null
    const origin = root?.querySelector<HTMLElement>('[data-journey-origin]')
    const end = root?.querySelector<HTMLElement>('[data-journey-end]')
    const footer = root?.querySelector<HTMLElement>('[data-journey-footer]')
    const reduce = matchMedia('(prefers-reduced-motion: reduce)')
    const sample = new URLSearchParams(location.search).get('markTime')
    const fixedAngle = sample !== null && Number.isFinite(Number(sample)) ? Number(sample) : null
    let width = 1, height = 1, dpr = 1, cell = 3.6, scale = 1
    let footerY = 1, footerHeight = 1, footerDockAt = 1, footerScale = 1
    const rotation = new LogoRotation((fixedAngle ?? 0) - .28, fixedAngle === null ? .18 : 0)
    let frame = 0, last = 0, elapsed = 0, draws = 0, visible = false, disposed = false
    let start: Mark = { x: 0, y: 0, width: 1 }, finish = { ...start }
    let posePitch = NaN
    let pose: Particle[] = [], poseAngle = NaN, poseTop = 0, poseHeight = 1
    const chars = 'oO0#%@'
    const atlas = document.createElement('canvas'); atlas.width = chars.length * 24; atlas.height = 32
    const glyphs = atlas.getContext('2d')
    if (!glyphs) return
    const buildAtlas = () => {
      glyphs.clearRect(0, 0, atlas.width, atlas.height)
      glyphs.font = '32px monospace'; glyphs.textAlign = 'center'; glyphs.textBaseline = 'middle'
      glyphs.fillStyle = getComputedStyle(host).color
      Array.from(chars).forEach((char, i) => glyphs.fillText(char, i * 24 + 12, 16))
    }
    // Sample the visible surface once. Hidden voxels never turn into extra dust.
    const project = (yaw: number, pitch: number): Particle[] => {
      const extent = Math.ceil(scale * 250 / cell), size = extent * 2 + 1
      const depth = new Float32Array(size * size); depth.fill(-Infinity)
      const winners = new Int32Array(size * size); winners.fill(-1)
      const lights = new Float32Array(volume.length)
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch)
      volume.forEach((p, i) => {
        const rx = p.x * cy + p.z * sy, rz = -p.x * sy + p.z * cy
        const ry = p.y * cx - rz * sx, z = p.y * sx + rz * cx, perspective = 800 / (800 - z)
        const px = rx * scale * perspective, py = ry * scale * perspective
        const nx = p.nx * cy + p.nz * sy, nz = -p.nx * sy + p.nz * cy
        const ny = p.ny * cx - nz * sx, normalZ = p.ny * sx + nz * cx
        lights[i] = clamp(.30 + Math.max(0, nx * -.45 + ny * -.55 + normalZ * .70) * .70)
        const footprint = Math.max(cell * .65, scale * 2.4 * perspective)
        for (let y = Math.floor((py - footprint) / cell); y <= Math.ceil((py + footprint) / cell); y++) {
          for (let x = Math.floor((px - footprint) / cell); x <= Math.ceil((px + footprint) / cell); x++) {
            if (Math.abs(x) > extent || Math.abs(y) > extent || (x * cell - px) ** 2 + (y * cell - py) ** 2 > footprint ** 2) continue
            const address = (y + extent) * size + x + extent
            if (z > depth[address]) { depth[address] = z; winners[address] = i }
          }
        }
      })
      const particles: Particle[] = []
      winners.forEach((i, address) => {
        if (i < 0) return
        const x = (address % size - extent) * cell, y = (Math.floor(address / size) - extent) * cell
        const seed = random(address), shade = lights[i]
        particles.push({ x, y, seed, glyph: Math.min(chars.length - 1, Math.floor((.25 + (1 - shade) * .75) * chars.length)),
          alpha: .68 + (1 - shade) * .27, delay: clamp(.5 - y / (scale * 170)) * .24 + seed * .12 })
      })
      return particles
    }
    const paint = (seconds = 0) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, height)
      const rootTop = root?.getBoundingClientRect().top ?? 0, hostTop = root ? host.getBoundingClientRect().top : 0
      const scroll = -rootTop, duration = height * .90
      const breakAt = start.y - height * .55, assembleAt = finish.y - height * .55
      const breakup = root ? clamp((scroll - breakAt) / duration) : 0
      const assembly = root ? clamp((scroll - assembleAt) / duration) : 0
      const atEnd = root ? scroll >= assembleAt : false
      const scatter = reduce.matches ? 0 : atEnd ? 1 - assembly : breakup
      const endIdle = atEnd && assembly >= 1
      const expandAt = assembleAt + duration + height * .12
      const expandedAt = Math.max(expandAt + 1, footerDockAt)
      const expansion = footer && endIdle ? clamp((scroll - expandAt) / (expandedAt - expandAt)) : 0
      const fragmented = Boolean(root && breakup > 0 && !endIdle)
      const angle = reduce.matches ? -.28 : rotation.advance(seconds, fragmented)
      const pitch = -.20
      // Both signs rotate autonomously; cursor movement never changes the pose.
      if (!pose.length || Math.abs(angle - poseAngle) > .002 || Math.abs(pitch - posePitch) > .002) {
        pose = project(angle, pitch); poseAngle = angle; posePitch = pitch
        poseTop = Math.min(...pose.map(p => p.y))
        poseHeight = Math.max(1, Math.max(...pose.map(p => p.y)) - poseTop)
      }
      const mark = atEnd ? finish : start
      const phase = atEnd ? assembly : breakup
      let centerY = root ? mark.y + duration * phase + rootTop - hostTop : height / 2
      let centerX = root ? mark.x : width / 2
      let displayScale = 1, logoOpacity = 1
      if (footer && endIdle) {
        const growth = easeInOut(expansion)
        // Grow continuously, then attach to the footer's document coordinates.
        // The final scale is a layout metric, never a function of yaw or wheel input.
        displayScale = 1 + (footerScale - 1) * growth
        centerX = finish.x + (width / 2 - finish.x) * growth
        const destinationY = footerY + rootTop
        centerY = height * .55 * (1 - growth) + destinationY * growth - hostTop
        logoOpacity = 1 - .93 * easeInOut(clamp(expansion * 2))
        const footerReveal = clamp((scroll - (footerY - footerHeight * .56 - height)) / (height * .75))
        logoOpacity += .09 * easeInOut(footerReveal) * growth
      }
      ctx.save()
      if (root) { ctx.beginPath(); ctx.rect(0, Math.max(0, 88 - hostTop), width, height); ctx.clip() }
      const drawGlyph = (p: Particle, x: number, y: number, alpha: number, size: number) => {
        if (y < -size || y > height + size || x < -size || x > width + size || alpha <= 0) return
        ctx.globalAlpha = alpha
        ctx.drawImage(atlas, p.glyph * 24, 0, 24, 32, x - size * .375, y - size * .55, size * .75, size * 1.1)
      }
      // The dust continues falling through the work section, with stable identities.
      const dustOpacity = root && !reduce.matches ? clamp((breakup - .62) / .38) * (1 - clamp((assembly - .12) / .50)) : 0
      let dustCount = 0
      if (dustOpacity > 0) {
        const cards = Array.from(root!.querySelectorAll<HTMLElement>('[data-work-card]')).map(card => card.getBoundingClientRect()).filter(r => r.bottom > 0 && r.top < height)
        const travel = (scroll - breakAt - duration) * .62 + elapsed * 22
        pose.forEach((p, i) => {
          if (i % 3) return
          const seed = random(i + 19), cycle = height + 160
          const y = ((seed * cycle + travel * (.6 + p.seed * .6)) % cycle + cycle) % cycle - 80
          const x = random(i + 91) * width + Math.sin(seed * 12 + travel * .0015) * 22
          if (cards.some(r => x > r.left - 18 && x < r.right + 18 && y + hostTop > r.top - 18 && y + hostTop < r.bottom + 18)) return
          drawGlyph(p, x, y, dustOpacity * (.20 + p.seed * .26), cell * 1.45)
          dustCount++
        })
      }
      if ((!atEnd && breakup < 1) || atEnd) for (const p of pose) {
        if (atEnd && assembly >= 1) {
          drawGlyph(p, centerX + p.x * displayScale, centerY + p.y * displayScale, p.alpha * logoOpacity, Math.max(2.2, cell * 1.95 * displayScale))
        } else if (atEnd) {
          // The upper rows settle first; the lower rows keep falling from above.
          const row = (p.y - poseTop) / poseHeight
          const arrival = clamp((assembly - row * .58 - p.seed * .10) / .32)
          const remaining = 1 - arrival
          const x = centerX + p.x + (p.seed - .5) * Math.min(width * .32, 220) * remaining * remaining
          const y = centerY + p.y - height * remaining * remaining * (1.12 + p.seed * .32)
          drawGlyph(p, x, y, p.alpha, cell * 1.95)
        } else {
          const t = clamp((scatter - p.delay) / (1 - p.delay))
          const gravity = height * (t * t * 1.02 + t * .08)
          const drift = (p.seed - .5) * Math.min(width * .38, 280) * t * t
          const flutter = Math.sin(p.seed * 24 + t * 5) * 16 * t
          drawGlyph(p, centerX + p.x + drift + flutter, centerY + p.y + gravity,
            p.alpha * (1 - clamp((t - .62) / .38)), cell * (1.95 - t * .45))
        }
      }
      ctx.restore(); host.dataset.ready = 'true'
      if (root) root.dataset.journeyReady = 'true'
      if (++draws % 4 === 0) Object.assign(host.dataset, { state: reduce.matches ? 'reduced' : 'running', breakup: breakup.toFixed(3), assembly: assembly.toFixed(3), scatter: scatter.toFixed(3), particles: String(pose.length), dust: String(dustCount), assemblyDirection: 'top-down', expansion: expansion.toFixed(3), displayScale: displayScale.toFixed(3), logoOpacity: logoOpacity.toFixed(3), location: expansion >= 1 ? 'footer' : expansion > 0 ? 'growing' : endIdle ? 'assembled' : atEnd ? 'assembling' : 'upper', rotation: angle.toFixed(3), capturedRotation: rotation.capturedAngle?.toFixed(3) ?? '', pointer: 'disabled', frame: String(draws) })
    }
    const tick = () => {
      if (disposed) return
      const now = performance.now(), dt = (now - last) / 1000
      if (dt >= 1 / 30) {
        last = now; elapsed += dt
        paint(dt)
      }
      frame = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(frame)
      if (reduce.matches) paint()
      else if (visible && document.visibilityState === 'visible') { last = performance.now(); frame = requestAnimationFrame(tick) }
      else host.dataset.state = 'paused'
    }
    const resize = () => {
      const rect = host.getBoundingClientRect(); width = Math.max(1, rect.width); height = Math.max(1, rect.height)
      dpr = Math.min(devicePixelRatio || 1, 1.5); cell = width < 750 ? 2.8 : 3.6
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      if (root && origin && end) {
        const base = root.getBoundingClientRect(), a = origin.getBoundingClientRect(), b = end.getBoundingClientRect()
        if (footer) {
          const f = footer.getBoundingClientRect()
          const slot = footer.querySelector<HTMLElement>('[data-footer-logo]')?.getBoundingClientRect() ?? f
          footerHeight = f.height; footerY = slot.top - base.top + slot.height / 2
          // Complete growth before the first footer pixel enters the viewport.
          footerDockAt = f.top - base.top - height
        }
        start = { x: a.left - base.left + a.width / 2, y: a.top - base.top + a.height / 2, width: a.width }
        finish = { x: b.left - base.left + b.width / 2, y: b.top - base.top + b.height / 2, width: b.width }
        scale = Math.min(start.width, finish.width) * .45 / 176
        const slot = footer?.querySelector<HTMLElement>('[data-footer-logo]')?.getBoundingClientRect()
        const targetScale = slot ? Math.min(slot.width * .45 / 176, slot.height * .40 / 110) : scale
        footerScale = targetScale / scale
        const docTop = base.top + scrollY
        const assemblyAt = finish.y - height * .55
        const expandAt = assemblyAt + height * 1.02
        Object.assign(root.dataset, { breakupAt: String(docTop + start.y - height * .55), assemblyAt: String(docTop + assemblyAt), particleDuration: String(height * .90), expandAt: String(docTop + expandAt), expandedAt: String(docTop + Math.max(expandAt + 1, footerDockAt)) })
      } else scale = Math.min(width * .45 / 176, height * .40 / 110)
      pose = []; poseAngle = NaN; buildAtlas(); paint()
    }
    const observer = new ResizeObserver(resize), intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .05 })
    observer.observe(host); if (root) observer.observe(root); intersection.observe(host)
    document.addEventListener('visibilitychange', sync); reduce.addEventListener('change', sync)
    resize(); sync()
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect()
      document.removeEventListener('visibilitychange', sync); reduce.removeEventListener('change', sync)
      if (root) delete root.dataset.journeyReady
    }
  }, [journey])
  return <div ref={ref} className="absolute inset-0 group/mark" aria-hidden="true">{!journey && <Logo className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[90%] -translate-x-1/2 -translate-y-1/2 opacity-75 group-data-[ready=true]/mark:hidden" />}<canvas className="block h-full w-full touch-pan-y" /></div>
}
