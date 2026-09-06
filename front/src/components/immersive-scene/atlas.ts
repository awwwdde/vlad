import * as THREE from 'three'
import { makeCanvas, type Ctx } from './draw'
import type { Atlas, AtlasRect } from './types'

/**
 * Сборщик текстурного атласа.
 *
 * Всё, что рисуется на 2D-канвасе, складывается в одну текстуру полочной
 * упаковкой. Смысл в количестве материалов: один атлас - один
 * MeshBasicMaterial на всю сцену, и десятки спрайтов не тянут за собой
 * десятки материалов и переключений текстуры.
 */
export class AtlasBuilder {
  private readonly size: number
  private readonly ctx: Ctx
  private readonly canvas: HTMLCanvasElement
  private readonly rects: Record<string, AtlasRect> = {}

  private shelfX = 0
  private shelfY = 0
  private shelfH = 0

  /** Поля вокруг ячейки: билинейная фильтрация подтягивает соседние пиксели,
   *  и без зазора спрайты «мажут» краями друг о друга. */
  private readonly pad = 2

  constructor(size = 2048) {
    this.size = size
    const made = makeCanvas(size, size)
    this.canvas = made.canvas
    this.ctx = made.ctx
  }

  /**
   * Кладёт ячейку в атлас и вызывает рисование в её локальных координатах:
   * начало отсчёта в центре ячейки, ось Y вниз.
   */
  add(key: string, w: number, h: number, draw: (ctx: Ctx) => void): AtlasRect {
    const cw = Math.ceil(w) + this.pad * 2
    const ch = Math.ceil(h) + this.pad * 2

    if (this.shelfX + cw > this.size) {
      this.shelfX = 0
      this.shelfY += this.shelfH
      this.shelfH = 0
    }
    if (this.shelfY + ch > this.size) {
      throw new Error(`atlas overflow on "${key}"`)
    }

    const rect: AtlasRect = {
      x: this.shelfX + this.pad,
      y: this.shelfY + this.pad,
      w: Math.ceil(w),
      h: Math.ceil(h),
    }
    this.rects[key] = rect
    this.shelfX += cw
    this.shelfH = Math.max(this.shelfH, ch)

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(rect.x, rect.y, rect.w, rect.h)
    this.ctx.clip()
    this.ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2)
    draw(this.ctx)
    this.ctx.restore()

    return rect
  }

  build(): Atlas {
    const texture = new THREE.CanvasTexture(this.canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.generateMipmaps = true
    texture.anisotropy = 4
    texture.needsUpdate = true
    return { texture, size: this.size, rects: this.rects }
  }
}

/**
 * Плоскость под ячейку атласа: обычная PlaneGeometry с переписанными UV.
 * Геометрия у каждого спрайта своя, но материал общий - именно так атлас и
 * окупается.
 */
export function planeFor(atlas: Atlas, key: string, w: number, h: number): THREE.PlaneGeometry {
  const rect = atlas.rects[key]
  if (!rect) throw new Error(`atlas: unknown key "${key}"`)

  const geo = new THREE.PlaneGeometry(w, h)
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute
  const s = atlas.size
  const u0 = rect.x / s
  const u1 = (rect.x + rect.w) / s
  // В канвасе ось Y вниз, в текстуре вверх: строки переворачиваем.
  const v0 = 1 - (rect.y + rect.h) / s
  const v1 = 1 - rect.y / s

  // Порядок вершин PlaneGeometry: левый верх, правый верх, левый низ, правый низ.
  uv.setXY(0, u0, v1)
  uv.setXY(1, u1, v1)
  uv.setXY(2, u0, v0)
  uv.setXY(3, u1, v0)
  uv.needsUpdate = true
  return geo
}

/** Материал для всех спрайтов атласа. Глубину не пишем: порядок задаётся
 *  renderOrder, иначе полупрозрачные края резали бы друг друга. */
export function atlasMaterial(atlas: Atlas): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: atlas.texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
}

/** Мера пикселей на единицу мира. Атлас рисуется в пикселях, сцена живёт
 *  в единицах; коэффициент держит плотность спрайтов одинаковой. */
export const PX_PER_UNIT = 96
