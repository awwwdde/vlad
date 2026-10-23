'use client'

import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import { cubicBezier } from 'framer-motion'

const ease = cubicBezier(.77, 0, .175, 1)
const clamp = (n: number) => Math.max(0, Math.min(1, n))
type Point = { x: number; y: number; shade: number }

/** One hover, one 3.2 s cycle: text → lit rotating torus → text. */
export function AsciiHoverText({ text, description, secret, children }: { text: string; description: string; secret: string; children?: ReactNode }) {
  const host = useRef<HTMLButtonElement>(null), label = useRef<HTMLSpanElement>(null), canvasRef = useRef<HTMLCanvasElement>(null)
  const baselineRef = useRef<HTMLSpanElement>(null)
  const cancel = useRef<() => void>(() => {}), busy = useRef(false), armed = useRef(true), cooldown = useRef(0)
  const [active, setActive] = useState(false), [still, setStill] = useState(false)
  const hint = useId()
  useEffect(() => () => cancel.current(), [text])

  function run(keyboard = false) {
    if (busy.current || performance.now() < cooldown.current) return
    const button = host.current, span = label.current, canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!button || !span || !canvas || !ctx) return
    let frame = 0, timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      cancelAnimationFrame(frame); clearTimeout(timer)
      busy.current = false; cooldown.current = performance.now() + 700
      setActive(false); setStill(false); button.dataset.asciiPhase = 'text'
      document.removeEventListener('visibilitychange', stop); window.removeEventListener('resize', stop)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    cancel.current = stop; busy.current = true
    document.addEventListener('visibilitychange', stop); window.addEventListener('resize', stop)
    if (keyboard || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true); setStill(true); timer = setTimeout(stop, 2200); return
    }
    const bounds = button.getBoundingClientRect(), style = getComputedStyle(span)
    const w = Math.max(1, Math.ceil(bounds.width)), textHeight = Math.ceil(bounds.height), h = textHeight + 64
    const step = 2.4, dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h
    const ink = mask.getContext('2d', { willReadFrequently: true })
    if (!ink) { stop(); return }
    ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`; ink.fillStyle = '#fff'
    const characters: { char: string; rect: DOMRect }[] = []
    const walker = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, { acceptNode: node => node.parentElement?.closest('[data-thinking-orb]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT }), range = document.createRange()
    let node: Node | null
    while ((node = walker.nextNode())) {
      let offset = 0
      for (const char of node.textContent ?? '') {
        range.setStart(node, offset); offset += char.length; range.setEnd(node, offset)
        const r = range.getBoundingClientRect()
        characters.push({ char, rect: r })
      }
    }
    const last = characters.at(-1)?.rect
    const descent = last && baselineRef.current ? last.bottom - baselineRef.current.getBoundingClientRect().top : ink.measureText('M').fontBoundingBoxDescent
    for (const { char, rect } of characters) ink.fillText(char, rect.left - bounds.left, rect.bottom - bounds.top + 32 - descent)
    const pixels = ink.getImageData(0, 0, w, h).data, original: Point[] = []
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) {
      const alpha = pixels[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] / 255
      if (alpha > .15) original.push({ x, y, shade: alpha })
    }
    if (!original.length) { stop(); return }
    const objectCenterY = (Math.min(...original.map(p => p.y)) + Math.max(...original.map(p => p.y))) / 2
    // A true toroidal surface, including normals: no flat glyph silhouette.
    const surface: { x: number; y: number; z: number; nx: number; ny: number; nz: number }[] = []
    for (let u = 0; u < 220; u++) for (let v = 0; v < 90; v++) {
      const a = u / 220 * Math.PI * 2, b = v / 90 * Math.PI * 2
      const tube = .31 + .055 * Math.sin(a * 3)
      surface.push({ x: (.68 + tube * Math.cos(b)) * Math.cos(a), y: (.68 + tube * Math.cos(b)) * Math.sin(a), z: tube * Math.sin(b), nx: Math.cos(b) * Math.cos(a), ny: Math.cos(b) * Math.sin(a), nz: Math.sin(b) })
    }
    const chars = '.:+*#@', atlas = document.createElement('canvas'); atlas.width = chars.length * 20; atlas.height = 24
    const glyphs = atlas.getContext('2d')
    if (!glyphs) { stop(); return }
    glyphs.font = '20px monospace'; glyphs.textAlign = 'center'; glyphs.textBaseline = 'middle'; glyphs.fillStyle = getComputedStyle(button).color
    Array.from(chars).forEach((char, i) => glyphs.fillText(char, i * 20 + 10, 12))
    const cols = Math.ceil(w / step), rows = Math.ceil(h / step), radius = Math.min(w * .40, h * .39)
    const depth = new Float32Array(cols * rows), shades = new Float32Array(cols * rows)
    const start = performance.now(), fixed = new URLSearchParams(location.search).get('eggTime')
    const preview = fixed !== null && Number.isFinite(Number(fixed)) ? clamp(Number(fixed)) : null
    let paintedAt = -Infinity
    setActive(true)
    const draw = (now: number) => {
      if (now - paintedAt < 1000 / 30) { frame = requestAnimationFrame(draw); return }
      paintedAt = now
      const p = preview ?? clamp((now - start) / 3200)
      const morph = p < .24 ? ease(p / .24) : p < .76 ? 1 : 1 - ease((p - .76) / .24)
      const yaw = p * Math.PI * 1.6 + .3, tilt = .65 + Math.sin(p * Math.PI * 2) * .28
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt)
      depth.fill(-Infinity)
      for (const point of surface) {
        const y = point.y * cx - point.z * sx, z0 = point.y * sx + point.z * cx
        const x = point.x * cy + z0 * sy, z = -point.x * sy + z0 * cy
        const ny = point.ny * cx - point.nz * sx, nz0 = point.ny * sx + point.nz * cx
        const nx = point.nx * cy + nz0 * sy, nz = -point.nx * sy + nz0 * cy
        const perspective = 3.5 / (3.5 - z * .35)
        const ix = Math.floor((w / 2 + x * radius * perspective) / step), iy = Math.floor((objectCenterY + y * radius * perspective) / step)
        if (ix < 0 || iy < 0 || ix >= cols || iy >= rows) continue
        const address = iy * cols + ix
        if (z > depth[address]) { depth[address] = z; shades[address] = .16 + Math.max(0, -nx * .45 - ny * .5 + nz * .73) * .84 }
      }
      const object: Point[] = []
      for (let i = 0; i < depth.length; i++) if (depth[i] !== -Infinity) object.push({ x: (i % cols + .5) * step, y: (Math.floor(i / cols) + .5) * step, shade: shades[i] })
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
      const count = Math.max(original.length, object.length)
      for (let i = 0; i < count; i++) {
        const a = original[Math.floor(i * original.length / count)], b = object[Math.floor(i * object.length / count)]
        if (!b) continue
        const x = a.x + (b.x - a.x) * morph, y = a.y + (b.y - a.y) * morph
        const shade = a.shade + (b.shade - a.shade) * morph, glyph = Math.min(chars.length - 1, Math.floor(shade * chars.length))
        ctx.globalAlpha = .25 + shade * .75
        ctx.drawImage(atlas, glyph * 20, 0, 20, 24, x - step * .55, y - step * .65, step * 1.1, step * 1.3)
      }
      button.dataset.asciiPhase = morph === 1 ? 'object' : 'morphing'
      if (preview !== null) return
      if (p < 1) frame = requestAnimationFrame(draw); else stop()
    }
    frame = requestAnimationFrame(draw)
  }
  function click(event: MouseEvent<HTMLButtonElement>) {
    if (event.detail === 0) run(true)
    else if (!matchMedia('(hover: hover) and (pointer: fine)').matches) run()
  }
  function hover(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType !== 'mouse' || !armed.current || busy.current || !matchMedia('(hover: hover) and (pointer: fine)').matches || !label.current) return
    // A wrapped heading has empty space inside its button. Only glyph ranges trigger it.
    const nodes = document.createTreeWalker(label.current, NodeFilter.SHOW_TEXT, { acceptNode: node => node.parentElement?.closest('[data-thinking-orb]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT })
    const range = document.createRange()
    let node: Node | null
    while ((node = nodes.nextNode())) {
      let offset = 0
      for (const char of node.textContent ?? '') {
        range.setStart(node, offset); offset += char.length; range.setEnd(node, offset)
        if (!char.trim()) continue
        const r = range.getBoundingClientRect()
        if (event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom) { armed.current = false; run(); return }
      }
    }
  }
  return <button ref={host} type="button" aria-label={text} aria-describedby={hint} data-ascii-hover data-ascii-active={active}
    onPointerEnter={hover} onPointerMove={hover}
    onPointerLeave={() => { armed.current = true }} onClick={click} onKeyDown={event => { if (event.key === 'Escape') cancel.current() }}
    className="relative inline-block max-w-full cursor-default border-0 bg-transparent p-0 text-left align-baseline text-inherit [font:inherit] [letter-spacing:inherit] [line-height:inherit]">
    <span ref={label} className={active ? 'opacity-0' : undefined}>{children ?? text}<span ref={baselineRef} aria-hidden className="inline-block h-0 w-0 align-baseline" /></span>
    <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute -top-8 left-0 h-[calc(100%+64px)] w-full" />
    {still && <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center font-mono text-[.5em] leading-tight">{secret}</span>}
    <span role="status" aria-live="polite" className="sr-only">{still ? secret : ''}</span>
    <span id={hint} className="sr-only">{description}</span>
  </button>
}
