/**
 * Цикл анимации.
 *
 * Отдельный модуль, потому что у цикла своя логика жизни: он обязан
 * останавливаться, когда сцена ушла из вьюпорта или вкладка неактивна.
 * Крутить WebGL за пределами экрана - это разряженная батарея и ничего больше.
 */
export interface Loop {
  start(): void
  stop(): void
  dispose(): void
}

export function createLoop(onFrame: (dt: number) => void): Loop {
  let raf = 0
  let last = 0
  let running = false

  const tick = (now: number) => {
    raf = requestAnimationFrame(tick)
    // Ограничиваем шаг: после сворачивания вкладки первый кадр приходит с
    // огромным dt, и частицы улетели бы за экран одним скачком.
    const dt = last === 0 ? 1 / 60 : Math.min((now - last) / 1000, 1 / 20)
    last = now
    onFrame(dt)
  }

  return {
    start() {
      if (running) return
      running = true
      last = 0
      raf = requestAnimationFrame(tick)
    },
    stop() {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
      raf = 0
    },
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      raf = 0
    },
  }
}
