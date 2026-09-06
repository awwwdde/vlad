'use client'

import { useEffect, useRef } from 'react'
import { PALETTE } from './config'
import { createLoop } from './animation'
import type { ImmersiveSceneCore } from './Scene'

/**
 * Клиентская обёртка над Three.js-сценой.
 *
 * На сервере WebGL нет, поэтому React рендерит только пустой контейнер с
 * заливкой цветом газона: разметка совпадает на сервере и на клиенте, и
 * гидратация проходит без расхождений. Сцена собирается после монтирования,
 * динамическим импортом - three.js не должен попадать ни в серверный бандл,
 * ни в первый чанк страницы.
 *
 * Канвас создаётся здесь же, в эффекте, а не рендерится React-ом. Причина в
 * StrictMode: в разработке эффект прогоняется дважды, между прогонами
 * dispose() гасит контекст через forceContextLoss(), и второй рендерер,
 * повешенный на тот же элемент, получил бы уже мёртвый канвас и не нарисовал
 * бы ничего. Свой канвас на каждый прогон снимает этот класс ошибок целиком.
 */
export function ImmersiveScene({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const canvas = document.createElement('canvas')
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    host.appendChild(canvas)

    let core: ImmersiveSceneCore | null = null
    let disposed = false
    const cleanups: Array<() => void> = []

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const loop = createLoop(dt => core?.frame(dt))

    void (async () => {
      const { ImmersiveSceneCore: Core } = await import('./Scene')
      if (disposed) return

      const rect = host.getBoundingClientRect()
      core = new Core({
        canvas,
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
        pixelRatio: window.devicePixelRatio || 1,
        reducedMotion: motionQuery.matches,
      })

      // ── Размер ────────────────────────────────────────────────────────────
      const ro = new ResizeObserver(entries => {
        const box = entries[0]?.contentRect
        if (!box || !core) return
        core.resize(
          Math.max(1, Math.round(box.width)),
          Math.max(1, Math.round(box.height)),
          window.devicePixelRatio || 1,
        )
      })
      ro.observe(host)
      cleanups.push(() => ro.disconnect())

      // ── Курсор ────────────────────────────────────────────────────────────
      const onPointerMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        const box = host.getBoundingClientRect()
        core?.setPointer(
          (e.clientX - box.left) / box.width - 0.5,
          (e.clientY - box.top) / box.height - 0.5,
        )
      }
      const onPointerLeave = () => core?.setPointer(0, 0)
      // Слушаем окно, а не контейнер: поверх сцены лежит текстовый слой,
      // и события до неё бы не доходили.
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      host.addEventListener('pointerleave', onPointerLeave)
      cleanups.push(() => {
        window.removeEventListener('pointermove', onPointerMove)
        host.removeEventListener('pointerleave', onPointerLeave)
      })

      // ── Пауза вне экрана и в неактивной вкладке ───────────────────────────
      let visible = document.visibilityState === 'visible'
      let onScreen = true
      const sync = () => (visible && onScreen ? loop.start() : loop.stop())

      const io = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting
        sync()
      })
      io.observe(host)
      cleanups.push(() => io.disconnect())

      const onVisibility = () => {
        visible = document.visibilityState === 'visible'
        sync()
      }
      document.addEventListener('visibilitychange', onVisibility)
      cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility))

      // ── Reduced motion может переключиться на лету ────────────────────────
      const onMotion = (e: MediaQueryListEvent) => core?.setReducedMotion(e.matches)
      motionQuery.addEventListener('change', onMotion)
      cleanups.push(() => motionQuery.removeEventListener('change', onMotion))

      sync()
    })()

    return () => {
      disposed = true
      loop.dispose()
      for (const fn of cleanups) fn()
      core?.dispose()
      core = null
      canvas.remove()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className={className}
      aria-hidden
      // Заливка цветом газона под канвасом: пока сцена грузится, в кадре
      // ровный фон, а не белая вспышка.
      style={{ backgroundColor: PALETTE.grass }}
    />
  )
}
