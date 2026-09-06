import * as THREE from 'three'
import { WORLD, breakpointFor } from './config'
import type { Breakpoint } from './types'

/**
 * Ортографическая камера: вид строго сверху, без перспективных искажений.
 * Перспективная камера дала бы сходящиеся края и сломала бы плоскую подачу.
 *
 * Мир 16x9 вписывается во вьюпорт по принципу cover: кадр всегда заполнен, а
 * лишнее срезается по той оси, где запас больше. На узких экранах вдобавок
 * подтягиваем зум и сдвигаем центр, чтобы главная часть композиции (правая и
 * нижняя) осталась в кадре.
 */
export class SceneCamera {
  readonly camera: THREE.OrthographicCamera

  constructor() {
    this.camera = new THREE.OrthographicCamera(-8, 8, 4.5, -4.5, 0.1, 100)
    this.camera.position.set(0, 0, 10)
    this.camera.lookAt(0, 0, 0)
  }

  resize(width: number, height: number): Breakpoint {
    const bp = breakpointFor(width)
    const aspect = width / Math.max(height, 1)

    // Cover: берём тот масштаб, при котором мир перекрывает вьюпорт по обеим осям.
    const scale = Math.max(WORLD.width / aspect, WORLD.height) / WORLD.height
    let halfH = (WORLD.height / 2) * scale
    let halfW = halfH * aspect

    // На мобильном кадр вытянут вертикально: приближаемся, иначе персонажи
    // становятся неразличимыми точками.
    let offsetX = 0
    let offsetY = 0
    if (bp === 'mobile') {
      halfH *= 0.62
      halfW *= 0.62
      // Сдвигаем окно вправо и вниз: там сосредоточена композиция, а слева
      // должно остаться место под текст.
      offsetX = 1.6
      offsetY = -0.5
    } else if (bp === 'tablet') {
      halfH *= 0.85
      halfW *= 0.85
      offsetX = 0.7
    }

    const cam = this.camera
    cam.left = -halfW + offsetX
    cam.right = halfW + offsetX
    cam.top = halfH + offsetY
    cam.bottom = -halfH + offsetY
    cam.updateProjectionMatrix()
    return bp
  }
}
