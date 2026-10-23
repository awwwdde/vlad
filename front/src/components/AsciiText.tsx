'use client'

import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { cubicBezier } from 'framer-motion'

type Dot = { x: number; y: number; shade: number }
const ease = cubicBezier(.77, 0, .175, 1)
const clamp = (n: number) => Math.max(0, Math.min(1, n))

/** Original hero easter egg: click to morph text into a hidden phrase and back. */
export function AsciiText({ text, secret, description, children }: { text: string; secret: string; description: string; children?: ReactNode }) {
  const buttonRef = useRef<HTMLButtonElement>(null), textRef = useRef<HTMLSpanElement>(null), canvasRef = useRef<HTMLCanvasElement>(null)
  const baselineRef = useRef<HTMLSpanElement>(null)
  const busy = useRef(false), cancel = useRef<() => void>(() => {})
  const hintId = useId()
  const [active, setActive] = useState(false), [still, setStill] = useState(false), [announcement, setAnnouncement] = useState('')
  useEffect(() => () => cancel.current(), [text, secret])

  function reveal(event: MouseEvent<HTMLButtonElement>) {
    if (busy.current) return
    const button = buttonRef.current, span = textRef.current, canvas = canvasRef.current, ctx = canvas?.getContext('2d')
    if (!button || !span || !canvas || !ctx) return
    let frame = 0, timer: ReturnType<typeof setTimeout> | undefined
    const stop = () => {
      cancelAnimationFrame(frame); clearTimeout(timer); ctx.clearRect(0, 0, canvas.width, canvas.height)
      busy.current = false; setActive(false); setStill(false); setAnnouncement('')
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', stop)
    }
    const visibility = () => { if (document.visibilityState !== 'visible') stop() }
    cancel.current = stop; busy.current = true
    document.addEventListener('visibilitychange', visibility); window.addEventListener('resize', stop)
    setAnnouncement(secret)
    if (event.detail === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true); setStill(true); timer = setTimeout(stop, 1800); return
    }
    const bounds = button.getBoundingClientRect(), style = getComputedStyle(span)
    const w = Math.max(1, Math.ceil(bounds.width)), h = Math.max(1, Math.ceil(bounds.height))
    const fontSize = parseFloat(style.fontSize), step = fontSize < 40 ? 2 : 2.8
    const mask = document.createElement('canvas'); mask.width = w; mask.height = h
    const ink = mask.getContext('2d', { willReadFrequently: true })
    if (!ink) { stop(); return }
    const font = (size: number) => `${style.fontWeight} ${size}px ${style.fontFamily}`
    ink.font = font(fontSize); ink.fillStyle = '#fff'; ink.textBaseline = 'alphabetic'
    const characters: { char: string; rect: DOMRect }[] = []
    const nodes = document.createTreeWalker(span, NodeFilter.SHOW_TEXT, { acceptNode: node => node.parentElement?.closest('[data-thinking-orb]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT })
    const range = document.createRange()
    let node: Node | null
    while ((node = nodes.nextNode())) {
      let offset = 0
      for (const char of node.textContent ?? '') {
        range.setStart(node, offset); offset += char.length; range.setEnd(node, offset)
        const r = range.getBoundingClientRect()
        characters.push({ char, rect: r })
      }
    }
    const last = characters.at(-1)?.rect
    const descent = last && baselineRef.current ? last.bottom - baselineRef.current.getBoundingClientRect().top : ink.measureText('M').fontBoundingBoxDescent
    for (const { char, rect } of characters) ink.fillText(char, rect.left - bounds.left, rect.bottom - bounds.top - descent)
    const sample = (): Dot[] => {
      const pixels = ink.getImageData(0, 0, w, h).data, dots: Dot[] = []
      for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) {
        const alpha = pixels[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] / 255
        if (alpha > .15) dots.push({ x, y, shade: alpha })
      }
      return dots
    }
    const original = sample()
    ink.clearRect(0, 0, w, h)
    const secretSize = Math.min(fontSize, fontSize * (w - 4) / Math.max(1, ink.measureText(secret).width))
    ink.font = font(secretSize); ink.textAlign = 'center'; ink.textBaseline = 'alphabetic'
    const metrics = ink.measureText(secret)
    const inkCenter = (Math.min(...original.map(p => p.y)) + Math.max(...original.map(p => p.y))) / 2
    ink.fillText(secret, w / 2, inkCenter + (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2)
    const hidden = sample()
    if (!original.length || !hidden.length) { stop(); return }
    const dpr = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr)
    const atlas = document.createElement('canvas'); atlas.width = 100; atlas.height = 24
    const glyphs = atlas.getContext('2d')
    if (!glyphs) { stop(); return }
    glyphs.font = '20px monospace'; glyphs.textAlign = 'center'; glyphs.textBaseline = 'middle'; glyphs.fillStyle = getComputedStyle(button).color
    Array.from(':+*#@').forEach((char, i) => glyphs.fillText(char, i * 20 + 10, 12))
    const count = Math.max(original.length, hidden.length), start = performance.now()
    const preview = new URLSearchParams(location.search).get('textTime')
    const fixedProgress = preview !== null && Number.isFinite(Number(preview)) ? clamp(Number(preview)) : null
    setActive(true)
    const draw = (now: number) => {
      const progress = fixedProgress ?? clamp((now - start) / 2400)
      const morph = progress < .36 ? ease(clamp((progress - .10) / .26)) : progress < .72 ? 1 : 1 - ease(clamp((progress - .72) / .28))
      const lift = Math.sin(morph * Math.PI)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h)
      for (let i = 0; i < count; i++) {
        const a = original[Math.min(original.length - 1, Math.floor(i * original.length / count))], b = hidden[Math.min(hidden.length - 1, Math.floor(i * hidden.length / count))]
        const x = a.x + (b.x - a.x) * morph
        const y = a.y + (b.y - a.y) * morph + Math.sin(x * .022 + i * .07 - progress * Math.PI * 4) * Math.min(h * .12, 12) * lift
        const shade = a.shade + (b.shade - a.shade) * morph, glyph = Math.min(4, Math.floor(shade * 3 + i % 2))
        ctx.globalAlpha = .6 + shade * .4
        ctx.drawImage(atlas, glyph * 20, 0, 20, 24, x - step * .65, y - step * .8, step * 1.3, step * 1.6)
      }
      button.dataset.asciiPhase = morph > .99 ? 'secret' : morph < .01 ? 'text' : 'morphing'
      if (fixedProgress !== null) return
      if (progress < 1) frame = requestAnimationFrame(draw); else stop()
    }
    frame = requestAnimationFrame(draw)
  }
  return <button ref={buttonRef} type="button" onClick={reveal} onKeyDown={event => { if (event.key === 'Escape') cancel.current() }} aria-label={text} aria-describedby={hintId} data-ascii-text data-ascii-active={active} className="relative inline-block max-w-full cursor-pointer border-0 bg-transparent p-0 text-left align-baseline text-inherit [font:inherit] [letter-spacing:inherit] [line-height:inherit] [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90">
    <span ref={textRef} className={active ? 'opacity-0' : undefined}>{children ?? text}<span ref={baselineRef} aria-hidden className="inline-block h-0 w-0 align-baseline" /></span>
    <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
    {still && <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-start font-mono text-[.64em] leading-tight">{secret}</span>}
    <span role="status" aria-live="polite" className="sr-only">{announcement}</span>
    <span id={hintId} className="sr-only">{description}</span>
  </button>
}
