import * as THREE from 'three'
import { AtlasBuilder, planeFor } from './atlas'
import { at, limb, roundRect, type Ctx } from './draw'
import { LAYER_ORDER, PALETTE, PARALLAX_DEPTH, PARALLAX_RANGE } from './config'
import { windAt } from './Wind'
import type { Atlas, PointerState, SceneLayer, WindState } from './types'

const PPU = 190

export type DevKind =
  | 'laptop'
  | 'monitor'
  | 'phone'
  | 'tablet'
  | 'browser'
  | 'wireframe'
  | 'card'
  | 'grid'
  | 'brackets'
  | 'cursor'
  | 'sketch'

export interface DevSpec {
  kind: DevKind
  x: number
  y: number
  rot: number
  scale: number
  phase: number
}

export const DEV_SIZE: Record<DevKind, [number, number]> = {
  laptop: [96, 74],
  monitor: [132, 96],
  phone: [28, 48],
  tablet: [62, 82],
  browser: [150, 102],
  wireframe: [112, 140],
  card: [72, 92],
  grid: [112, 112],
  brackets: [72, 72],
  cursor: [34, 46],
  sketch: [122, 92],
}

/** Полоса-плейсхолдер вместо текста. Читаемых надписей в сцене быть не должно:
 *  они превращают иллюстрацию в скриншот интерфейса. */
function bar(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string): void {
  at(ctx, x + w / 2, y + h / 2, 0, () => roundRect(ctx, w, h, Math.min(h / 2, 3), fill))
}

const DRAW: Record<DevKind, (ctx: Ctx) => void> = {
  laptop: ctx => {
    at(ctx, 0, 8, 0, () => roundRect(ctx, 88, 52, 5, PALETTE.cream))
    at(ctx, 0, -18, 0, () => roundRect(ctx, 78, 46, 4, '#cfcabb'))
    at(ctx, 0, -18, 0, () => roundRect(ctx, 70, 38, 3, PALETTE.screen))
    bar(ctx, -30, -32, 30, 4, PALETTE.blue)
    bar(ctx, -30, -24, 44, 4, '#c9c4b4')
    bar(ctx, -30, -16, 22, 4, PALETTE.orange)
    at(ctx, 0, 10, 0, () => roundRect(ctx, 62, 30, 3, '#e0dccf'))
  },
  monitor: ctx => {
    at(ctx, 0, -6, 0, () => roundRect(ctx, 124, 78, 5, '#d5d0c2'))
    at(ctx, 0, -6, 0, () => roundRect(ctx, 112, 66, 3, PALETTE.screen))
    bar(ctx, -50, -34, 46, 6, PALETTE.forest)
    bar(ctx, -50, -22, 30, 5, '#cbc6b6')
    at(ctx, 22, -6, 0, () => roundRect(ctx, 52, 30, 3, PALETTE.leafPale))
    bar(ctx, -50, 4, 40, 5, '#cbc6b6')
    at(ctx, 0, 38, 0, () => roundRect(ctx, 34, 8, 4, '#c2bdae'))
  },
  phone: ctx => {
    roundRect(ctx, 24, 44, 5, PALETTE.ink)
    at(ctx, 0, 0, 0, () => roundRect(ctx, 19, 37, 3, PALETTE.blue))
  },
  tablet: ctx => {
    roundRect(ctx, 58, 78, 6, '#d5d0c2')
    at(ctx, 0, 0, 0, () => roundRect(ctx, 50, 68, 4, PALETTE.screen))
    bar(ctx, -21, -28, 28, 5, PALETTE.yellow)
    bar(ctx, -21, -18, 40, 4, '#cbc6b6')
    at(ctx, 0, 8, 0, () => roundRect(ctx, 40, 26, 3, PALETTE.blue))
  },
  browser: ctx => {
    roundRect(ctx, 144, 96, 5, PALETTE.cream)
    bar(ctx, -66, -42, 132, 10, '#e2ddce')
    for (let i = 0; i < 3; i++) {
      at(ctx, -60 + i * 9, -37, 0, () => roundRect(ctx, 5, 5, 2.5, '#c3beaf'))
    }
    at(ctx, -32, -8, 0, () => roundRect(ctx, 62, 40, 3, PALETTE.blue))
    bar(ctx, 6, -26, 58, 6, '#d7d2c3')
    bar(ctx, 6, -14, 44, 6, '#d7d2c3')
    at(ctx, 34, 6, 0, () => roundRect(ctx, 46, 22, 3, PALETTE.yellow))
    bar(ctx, -66, 28, 132, 14, '#ebe6d8')
  },
  wireframe: ctx => {
    roundRect(ctx, 106, 134, 4, PALETTE.cream)
    ctx.globalAlpha = 0.5
    at(ctx, 0, -46, 0, () => roundRect(ctx, 86, 30, 2, '#ffffff'))
    ctx.globalAlpha = 1
    // Перечёркнутый прямоугольник - универсальный знак «здесь будет картинка».
    ctx.strokeStyle = '#b9b4a4'
    ctx.lineWidth = 1.5
    ctx.strokeRect(-43, -61, 86, 30)
    ctx.beginPath()
    ctx.moveTo(-43, -61)
    ctx.lineTo(43, -31)
    ctx.moveTo(43, -61)
    ctx.lineTo(-43, -31)
    ctx.stroke()
    bar(ctx, -43, -22, 60, 6, '#cdc8b8')
    bar(ctx, -43, -10, 78, 6, '#cdc8b8')
    at(ctx, -22, 20, 0, () => roundRect(ctx, 38, 32, 3, PALETTE.blue))
    at(ctx, 22, 20, 0, () => roundRect(ctx, 38, 32, 3, PALETTE.yellow))
    bar(ctx, -43, 46, 50, 6, '#cdc8b8')
  },
  card: ctx => {
    roundRect(ctx, 66, 86, 5, PALETTE.white)
    at(ctx, 0, -22, 0, () => roundRect(ctx, 54, 32, 3, PALETTE.orange))
    bar(ctx, -27, 2, 40, 5, '#d5d0c0')
    bar(ctx, -27, 12, 52, 5, '#d5d0c0')
    at(ctx, -14, 32, 0, () => roundRect(ctx, 28, 10, 5, PALETTE.forest))
  },
  grid: ctx => {
    ctx.strokeStyle = 'rgba(255,255,255,0.72)'
    ctx.lineWidth = 1.4
    for (let i = 0; i <= 3; i++) {
      const p = -52 + i * 35
      ctx.beginPath()
      ctx.moveTo(p, -52)
      ctx.lineTo(p, 52)
      ctx.moveTo(-52, p)
      ctx.lineTo(52, p)
      ctx.stroke()
    }
  },
  brackets: ctx => {
    roundRect(ctx, 64, 64, 6, PALETTE.cream)
    ctx.strokeStyle = PALETTE.forest
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-8, -12)
    ctx.lineTo(-18, 0)
    ctx.lineTo(-8, 12)
    ctx.moveTo(8, -12)
    ctx.lineTo(18, 0)
    ctx.lineTo(8, 12)
    ctx.stroke()
  },
  cursor: ctx => {
    ctx.beginPath()
    ctx.moveTo(-10, -20)
    ctx.lineTo(-10, 18)
    ctx.lineTo(-1, 9)
    ctx.lineTo(5, 21)
    ctx.lineTo(11, 18)
    ctx.lineTo(5, 7)
    ctx.lineTo(14, 5)
    ctx.closePath()
    ctx.fillStyle = PALETTE.white
    ctx.fill()
    ctx.strokeStyle = PALETTE.ink
    ctx.lineWidth = 1.6
    ctx.lineJoin = 'round'
    ctx.stroke()
  },
  sketch: ctx => {
    at(ctx, 0, 0, 0.04, () => roundRect(ctx, 112, 84, 3, PALETTE.cream))
    ctx.globalAlpha = 0.75
    limb(ctx, -44, -26, 12, -26, 3, '#c0bbab')
    limb(ctx, -44, -14, 34, -14, 3, '#c0bbab')
    ctx.globalAlpha = 1
    at(ctx, -24, 12, 0, () => roundRect(ctx, 40, 34, 3, PALETTE.leafPale))
    at(ctx, 22, 6, 0, () => roundRect(ctx, 30, 22, 3, PALETTE.yellow))
    at(ctx, 26, 30, 0, () => roundRect(ctx, 30, 10, 3, '#d3cebe'))
  },
}

export function registerDevObjects(builder: AtlasBuilder): void {
  for (const kind of Object.keys(DRAW) as DevKind[]) {
    const [w, h] = DEV_SIZE[kind]
    builder.add(`dev:${kind}`, w, h, DRAW[kind])
  }
}

export class DevObjectLayer implements SceneLayer {
  readonly object = new THREE.Group()
  private readonly items: Array<{ mesh: THREE.Mesh; spec: DevSpec }> = []
  private readonly geometries: THREE.BufferGeometry[] = []

  constructor(atlas: Atlas, material: THREE.Material, specs: DevSpec[]) {
    this.object.renderOrder = LAYER_ORDER.devObject

    for (const spec of specs) {
      const [w, h] = DEV_SIZE[spec.kind]
      const geo = planeFor(atlas, `dev:${spec.kind}`, w / PPU, h / PPU)
      this.geometries.push(geo)
      const mesh = new THREE.Mesh(geo, material)
      mesh.position.set(spec.x, spec.y, 0)
      mesh.rotation.z = spec.rot
      mesh.scale.setScalar(spec.scale)
      mesh.renderOrder = LAYER_ORDER.devObject
      this.object.add(mesh)
      this.items.push({ mesh, spec })
    }
  }

  update(_dt: number, wind: WindState, pointer: PointerState): void {
    const px = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.ground
    const py = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.ground

    for (const { mesh, spec } of this.items) {
      // Предметы лежат на траве и почти неподвижны: только едва заметный
      // поворот от ветра, чтобы слой не выглядел приклеенным к фону.
      const w = windAt(wind, spec.x, spec.y, spec.phase)
      mesh.rotation.z = spec.rot + w * 0.006
      mesh.position.x = spec.x + px
      mesh.position.y = spec.y + py
    }
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose()
    this.geometries.length = 0
    this.object.clear()
  }
}
