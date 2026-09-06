import type { WindState } from './types'

/**
 * Общий ветер сцены.
 *
 * Один источник на все слои: листва, трава, тени и частицы качаются от одного
 * и того же поля, поэтому кадр читается как одна среда, а не как набор
 * независимых анимаций. Периоды взяты несоизмеримыми - совпадающая фаза не
 * повторяется, и петля не выдаёт себя.
 */
export class Wind {
  private readonly state: WindState = { time: 0, x: 0, y: 0, gust: 0 }

  advance(dt: number): WindState {
    const t = (this.state.time += dt)

    // Направление: две медленные гармоники, чтобы ветер «гулял», а не дул ровно.
    this.state.x = Math.sin(t * 0.21) * 0.7 + Math.sin(t * 0.083 + 1.7) * 0.3
    this.state.y = Math.sin(t * 0.147 + 2.3) * 0.35 + Math.sin(t * 0.061) * 0.15

    // Огибающая порыва: держится около 0.35, изредка доходя до единицы.
    const g = Math.sin(t * 0.117) * 0.5 + Math.sin(t * 0.043 + 0.9) * 0.5
    this.state.gust = 0.35 + Math.max(0, g) * 0.65

    return this.state
  }

  get current(): WindState {
    return this.state
  }
}

/**
 * Локальное значение ветра в точке. Фазовый сдвиг по координатам заставляет
 * порыв прокатываться по сцене волной, а не двигать всё синхронно.
 */
export function windAt(wind: WindState, x: number, y: number, phase = 0): number {
  return (
    Math.sin(wind.time * 0.9 + x * 0.35 + y * 0.2 + phase) * 0.6 +
    Math.sin(wind.time * 0.37 + x * 0.11 - y * 0.17 + phase * 1.7) * 0.4
  ) * wind.gust
}
