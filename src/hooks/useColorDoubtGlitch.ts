import { useEffect, useRef, useCallback } from 'react'
import type { RefObject } from 'react'

// ─── Параметры состояния глитча ────────────────────────────────────
export interface GlitchPalette {
  bg:       string  // целевой фон, в который "разрушается" исходный
  text:     string  // целевой цвет текста
  clipBg:   string  // целевой фон плашки
}

interface Options {
  // Ref на контейнер секции (relative-родитель canvas)
  sectionRef: RefObject<HTMLElement>
  // Ref на canvas внутри секции
  canvasRef: RefObject<HTMLCanvasElement>
  // Ref на источник пикселей (плашка с словом)
  triggerRef: RefObject<HTMLElement>
  // Палитра состояния A (исходное)
  paletteA: GlitchPalette
  // Палитра состояния B (целевое при удержании)
  paletteB: GlitchPalette
  // Колбэк когда intensity дошла до 1 — переключить state на B
  onReachB?: () => void
  // Колбэк когда intensity дошла до 0 — вернуть state на A
  onReachA?: () => void
  // Размер одного блока (px)
  blockSize?: number
}

interface GlitchPixel {
  x:         number
  y:         number
  w:         number
  color:     string
  life:      number
  maxLife:   number
  offsetX:   number
  returning: boolean
  vx:        number
  vy:        number
}

export interface GlitchHandle {
  startHold: () => void
  stopHold:  () => void
}

export function useColorDoubtGlitch({
  sectionRef,
  canvasRef,
  triggerRef,
  paletteA,
  paletteB,
  onReachA,
  onReachB,
  blockSize = 14,
}: Options): GlitchHandle {
  const pixelsRef     = useRef<GlitchPixel[]>([])
  const holdingRef    = useRef(false)
  const intensityRef  = useRef(0)
  const isStateBRef   = useRef(false)
  const wasHoldingRef = useRef(false)
  const rafRef        = useRef<number | null>(null)

  // ── Вспомогательные функции ──────────────────────────────────────
  const getTrigPos = useCallback(() => {
    const trig    = triggerRef.current
    const section = sectionRef.current
    if (!trig || !section) return { x: 0, y: 0 }
    const tr = trig.getBoundingClientRect()
    const sr = section.getBoundingClientRect()
    return {
      x: tr.left - sr.left + tr.width  / 2,
      y: tr.top  - sr.top  + tr.height / 2,
    }
  }, [sectionRef, triggerRef])

  const getGlitchColors = useCallback(() => {
    const target = isStateBRef.current ? paletteA : paletteB
    return [
      target.bg, target.bg, target.bg,
      target.text, target.text,
      target.clipBg,
    ]
  }, [paletteA, paletteB])

  // ── Главный цикл ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas  = canvasRef.current
    const section = sectionRef.current
    if (!canvas || !section) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = Math.max(1, window.devicePixelRatio || 1)
    let W = 0, H = 0, COLS = 0, ROWS = 0

    function resize() {
      const r = section!.getBoundingClientRect()
      W = r.width
      H = r.height
      canvas!.width  = W * DPR
      canvas!.height = H * DPR
      canvas!.style.width  = W + 'px'
      canvas!.style.height = H + 'px'
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0)
      COLS = Math.ceil(W / blockSize)
      ROWS = Math.ceil(H / blockSize)
    }
    resize()

    const onResize = () => resize()
    window.addEventListener('resize', onResize)

    function spawnGlitch() {
      const t = getTrigPos()
      const radius = 70 + intensityRef.current * Math.max(W, H) * 0.8
      const count  = Math.floor(2 + intensityRef.current * 9)
      const colors = getGlitchColors()
      for (let i = 0; i < count; i++) {
        const ang  = Math.random() * Math.PI * 2
        const dist = Math.sqrt(Math.random()) * radius
        const px   = t.x + Math.cos(ang) * dist
        const py   = t.y + Math.sin(ang) * dist
        const c    = Math.floor(px / blockSize)
        const r    = Math.floor(py / blockSize)
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue
        const w     = Math.random() < 0.7 ? 1 : Math.floor(Math.random() * 3) + 1
        const life  = 4 + Math.floor(Math.random() * 8)
        pixelsRef.current.push({
          x: c * blockSize,
          y: r * blockSize,
          w,
          color: colors[Math.floor(Math.random() * colors.length)],
          life,
          maxLife: life,
          offsetX: Math.random() < 0.15 ? (Math.random() - 0.5) * blockSize * 4 : 0,
          returning: false,
          vx: 0, vy: 0,
        })
      }
    }

    function spawnScanLine() {
      if (Math.random() > intensityRef.current * 0.4) return
      const t = getTrigPos()
      const r = Math.floor(t.y / blockSize) + (Math.floor(Math.random() * 20) - 10)
      if (r < 0 || r >= ROWS) return
      const colors  = getGlitchColors()
      const startC  = Math.max(0, Math.floor(t.x / blockSize) - 15 + Math.floor(Math.random() * 10))
      const len     = 10 + Math.floor(Math.random() * 20)
      const offsetX = (Math.random() - 0.5) * blockSize * 8
      for (let i = 0; i < len; i++) {
        const c = startC + i
        if (c < 0 || c >= COLS) continue
        pixelsRef.current.push({
          x: c * blockSize,
          y: r * blockSize,
          w: 1,
          color: colors[Math.floor(Math.random() * 3)],
          life: 3 + Math.floor(Math.random() * 4),
          maxLife: 6,
          offsetX,
          returning: false,
          vx: 0, vy: 0,
        })
      }
    }

    function startReturning() {
      for (const p of pixelsRef.current) {
        if (p.returning) continue
        p.returning = true
        p.vx = (Math.random() - 0.5) * 1.5
        p.vy = (Math.random() - 0.5) * 1.5
        p.life = Math.max(p.life, 30)
        p.maxLife = p.life
      }
    }

    // Сохраняем для использования в startHold/stopHold
    ;(canvas as any).__startReturning = startReturning

    function tick() {
      ctx!.clearRect(0, 0, W, H)

      if (holdingRef.current) intensityRef.current = Math.min(1, intensityRef.current + 0.0055)
      else                    intensityRef.current = Math.max(0, intensityRef.current - 0.012)

      if (holdingRef.current && intensityRef.current >= 0.99 && !isStateBRef.current) {
        isStateBRef.current = true
        onReachB?.()
      }
      if (!holdingRef.current && intensityRef.current <= 0.01 && isStateBRef.current) {
        isStateBRef.current = false
        onReachA?.()
      }

      if (holdingRef.current && intensityRef.current > 0.01) {
        spawnGlitch()
        if (Math.random() < 0.15) spawnScanLine()
      }

      const t = getTrigPos()

      for (let i = pixelsRef.current.length - 1; i >= 0; i--) {
        const p = pixelsRef.current[i]

        if (p.returning) {
          const dx = t.x - (p.x + p.offsetX + blockSize * p.w / 2)
          const dy = t.y - (p.y + blockSize / 2)
          const d  = Math.max(1, Math.hypot(dx, dy))
          const PULL = 0.18
          p.vx += (dx / d) * PULL * (1 + d * 0.005)
          p.vy += (dy / d) * PULL * (1 + d * 0.005)
          p.vx *= 0.92
          p.vy *= 0.92
          p.x  += p.vx
          p.y  += p.vy
          if (d < blockSize * 1.5) {
            pixelsRef.current.splice(i, 1)
            continue
          }
          ctx!.globalAlpha = 0.9
        } else {
          const alpha = p.life / p.maxLife
          ctx!.globalAlpha = alpha * 0.95
        }

        ctx!.fillStyle = p.color
        ctx!.fillRect(p.x + p.offsetX, p.y, blockSize * p.w + 0.5, blockSize + 0.5)

        if (!p.returning) {
          p.life--
          if (p.life <= 0) pixelsRef.current.splice(i, 1)
        }
      }
      ctx!.globalAlpha = 1

      if (pixelsRef.current.length > 3000) {
        pixelsRef.current.splice(0, pixelsRef.current.length - 3000)
      }

      rafRef.current = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      pixelsRef.current = []
    }
  }, [canvasRef, sectionRef, blockSize, getGlitchColors, getTrigPos, onReachA, onReachB])

  // ── Публичный API ────────────────────────────────────────────────
  const startHold = useCallback(() => {
    holdingRef.current  = true
    wasHoldingRef.current = true
  }, [])

  const stopHold = useCallback(() => {
    holdingRef.current = false
    if (wasHoldingRef.current) {
      const canvas = canvasRef.current as any
      canvas?.__startReturning?.()
      wasHoldingRef.current = false
    }
  }, [canvasRef])

  return { startHold, stopHold }
}
