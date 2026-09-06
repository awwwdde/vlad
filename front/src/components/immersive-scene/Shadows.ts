import * as THREE from 'three'
import { AtlasBuilder, planeFor } from './atlas'
import { at, blob } from './draw'
import { LAYER_ORDER, PARALLAX_DEPTH, PARALLAX_RANGE, rng } from './config'
import { windAt } from './Wind'
import type { Atlas, PointerState, SceneLayer, WindState } from './types'

const PPU = 190
const CLUSTERS = 4
const CELL = 560

/**
 * Тени кроны - главный декоративный элемент кадра.
 *
 * Это не одно пятно, а несколько кластеров листовых клякс. Прозрачность
 * запечена в текстуру: материал у сцены общий, и задать альфу отдельному мешу
 * было бы нечем. Кластеры двигаются медленно и вразнобой - так тень читается
 * как проекция качающегося дерева, а не как ползущая наклейка.
 */
export function registerShadows(builder: AtlasBuilder): void {
  for (let c = 0; c < CLUSTERS; c++) {
    const rand = rng(4100 + c * 37)
    builder.add(`shadow:${c}`, CELL, CELL, ctx => {
      const count = 14 + Math.floor(rand() * 8)
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2
        const d = Math.pow(rand(), 0.62) * CELL * 0.34
        const r = 34 + rand() * 76
        // Тень сплошная по цвету, но полупрозрачная: наложения дают более
        // плотные участки сами собой, как настоящая листва в несколько слоёв.
        ctx.globalAlpha = 0.1 + rand() * 0.09
        at(ctx, Math.cos(a) * d, Math.sin(a) * d, rand() * Math.PI, () => {
          blob(ctx, r, 0.3, 34, rand, '#1d3d16')
        })
      }
      ctx.globalAlpha = 1
    })
  }
}

export interface ShadowSpec {
  cluster: number
  x: number
  y: number
  scale: number
  phase: number
}

export class ShadowLayer implements SceneLayer {
  readonly object = new THREE.Group()
  private readonly items: Array<{ mesh: THREE.Mesh; spec: ShadowSpec }> = []
  private readonly geometries: THREE.BufferGeometry[] = []

  constructor(atlas: Atlas, material: THREE.Material, specs: ShadowSpec[]) {
    this.object.renderOrder = LAYER_ORDER.treeShadow

    for (const spec of specs) {
      const geo = planeFor(atlas, `shadow:${spec.cluster}`, CELL / PPU, CELL / PPU)
      this.geometries.push(geo)
      const mesh = new THREE.Mesh(geo, material)
      mesh.position.set(spec.x, spec.y, 0)
      mesh.scale.setScalar(spec.scale)
      mesh.renderOrder = LAYER_ORDER.treeShadow
      this.object.add(mesh)
      this.items.push({ mesh, spec })
    }
  }

  update(_dt: number, wind: WindState, pointer: PointerState): void {
    const px = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.ground
    const py = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.ground

    for (const { mesh, spec } of this.items) {
      const w = windAt(wind, spec.x, spec.y, spec.phase)
      // Смещение крупное по меркам сцены, но медленное: глаз не ловит момент
      // движения, а через минуту тень оказывается в другом месте.
      mesh.position.x = spec.x + px + w * 0.16
      mesh.position.y = spec.y + py + w * 0.09
      mesh.rotation.z = w * 0.03
      const s = spec.scale * (1 + Math.sin(wind.time * 0.19 + spec.phase) * 0.018)
      mesh.scale.setScalar(s)
    }
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose()
    this.geometries.length = 0
    this.object.clear()
  }
}

/** Кластеры прижаты к правому краю и уходят за него: дерево стоит за кадром. */
export function layoutShadows(): ShadowSpec[] {
  return [
    { cluster: 0, x: 5.6, y: 2.4, scale: 1.35, phase: 0.0 },
    { cluster: 1, x: 7.0, y: -0.6, scale: 1.5, phase: 1.3 },
    { cluster: 2, x: 5.2, y: -2.9, scale: 1.15, phase: 2.5 },
    { cluster: 3, x: 7.2, y: 3.2, scale: 1.3, phase: 3.7 },
    { cluster: 1, x: 3.6, y: 1.0, scale: 0.8, phase: 4.9 },
    { cluster: 2, x: 7.4, y: -3.4, scale: 1.05, phase: 5.8 },
  ]
}
