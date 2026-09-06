import * as THREE from 'three'
import { AtlasBuilder, planeFor } from './atlas'
import { ellipse, leaf } from './draw'
import {
  BOUNDS,
  LAYER_ORDER,
  PALETTE,
  PARALLAX_DEPTH,
  PARALLAX_RANGE,
  WORLD,
  rng,
} from './config'
import { windAt } from './Wind'
import type { Atlas, PointerState, SceneLayer, WindState } from './types'

const PPU = 190
const KINDS = ['dust:leaf', 'dust:pollen'] as const
const CELL = 22

export function registerParticles(builder: AtlasBuilder): void {
  builder.add('dust:leaf', CELL, CELL, ctx => {
    ctx.globalAlpha = 0.85
    leaf(ctx, 16, 7, PALETTE.leafPale)
    ctx.globalAlpha = 1
  })
  builder.add('dust:pollen', CELL, CELL, ctx => {
    ctx.globalAlpha = 0.55
    ellipse(ctx, 3.2, 3.2, PALETTE.cream)
    ctx.globalAlpha = 1
  })
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  scale: number
  phase: number
}

/**
 * Пыльца и редкие листья. Частиц намеренно мало: их роль - подтвердить, что
 * воздух в сцене движется, а не устроить снегопад.
 */
export class ParticleLayer implements SceneLayer {
  readonly object = new THREE.Group()
  private readonly meshes: THREE.InstancedMesh[] = []
  private readonly pools: Particle[][] = []
  private readonly geometries: THREE.BufferGeometry[] = []
  private readonly dummy = new THREE.Object3D()

  constructor(atlas: Atlas, material: THREE.Material, count: number) {
    this.object.renderOrder = LAYER_ORDER.particle
    const rand = rng(31337)

    KINDS.forEach((kind, k) => {
      const n = k === 0 ? Math.round(count * 0.35) : count - Math.round(count * 0.35)
      if (n <= 0) return
      const geo = planeFor(atlas, kind, CELL / PPU, CELL / PPU)
      this.geometries.push(geo)
      const mesh = new THREE.InstancedMesh(geo, material, n)
      mesh.frustumCulled = false
      mesh.renderOrder = LAYER_ORDER.particle
      this.object.add(mesh)
      this.meshes.push(mesh)

      const pool: Particle[] = []
      for (let i = 0; i < n; i++) {
        pool.push({
          x: BOUNDS.left + rand() * WORLD.width,
          y: BOUNDS.bottom + rand() * WORLD.height,
          vx: 0.08 + rand() * 0.14,
          vy: (rand() - 0.5) * 0.06,
          rot: rand() * Math.PI * 2,
          spin: (rand() - 0.5) * 0.5,
          scale: (k === 0 ? 0.8 : 0.5) + rand() * 0.6,
          phase: rand() * Math.PI * 2,
        })
      }
      this.pools.push(pool)
    })
  }

  update(dt: number, wind: WindState, pointer: PointerState): void {
    const px = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.particle
    const py = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.particle
    const margin = 1.2

    for (let m = 0; m < this.meshes.length; m++) {
      const mesh = this.meshes[m]
      const pool = this.pools[m]
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i]
        const w = windAt(wind, p.x, p.y, p.phase)

        p.x += (p.vx + w * 0.12) * dt
        p.y += (p.vy + Math.sin(wind.time * 0.8 + p.phase) * 0.05) * dt
        p.rot += p.spin * dt

        // Улетевшие за правый край возвращаются слева: поток не иссякает и
        // не требует пересоздания объектов.
        if (p.x > BOUNDS.right + margin) {
          p.x = BOUNDS.left - margin
          p.y = BOUNDS.bottom + Math.random() * WORLD.height
        }
        if (p.y > BOUNDS.top + margin) p.y = BOUNDS.bottom - margin
        if (p.y < BOUNDS.bottom - margin) p.y = BOUNDS.top + margin

        this.dummy.position.set(p.x + px, p.y + py, 0)
        this.dummy.rotation.z = p.rot
        this.dummy.scale.setScalar(p.scale)
        this.dummy.updateMatrix()
        mesh.setMatrixAt(i, this.dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  dispose(): void {
    for (const mesh of this.meshes) mesh.dispose()
    for (const geo of this.geometries) geo.dispose()
    this.meshes.length = 0
    this.geometries.length = 0
    this.object.clear()
  }
}
