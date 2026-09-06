import * as THREE from 'three'
import { AtlasBuilder, planeFor } from './atlas'
import { at, branch, leaf } from './draw'
import { LAYER_ORDER, PALETTE, PARALLAX_DEPTH, PARALLAX_RANGE, rng } from './config'
import { windAt } from './Wind'
import type { Atlas, PointerState, SceneLayer, WindState } from './types'

const PPU = 190
const CLUSTER_CELL = 240
const CLUSTER_KINDS = 4
const BRANCH_CELL = { w: 420, h: 260 }

/**
 * Крона в правом верхнем углу: ветви и кластеры листьев.
 *
 * Кластеры - отдельные ячейки атласа, чтобы каждый качался со своей фазой,
 * поворотом и масштабом. Одна большая текстура кроны двигалась бы целиком и
 * читалась бы как покачивание картинки, а не листвы.
 */
export function registerTree(builder: AtlasBuilder): void {
  for (let k = 0; k < CLUSTER_KINDS; k++) {
    const rand = rng(7700 + k * 53)
    builder.add(`leafcluster:${k}`, CLUSTER_CELL, CLUSTER_CELL, ctx => {
      const count = 9 + Math.floor(rand() * 6)
      for (let i = 0; i < count; i++) {
        const a = rand() * Math.PI * 2
        const d = Math.pow(rand(), 0.55) * CLUSTER_CELL * 0.32
        const len = 46 + rand() * 44
        const tone = rand()
        const fill =
          tone > 0.72 ? PALETTE.leafPale : tone > 0.4 ? PALETTE.leafLight : PALETTE.leaf
        at(ctx, Math.cos(a) * d, Math.sin(a) * d, a + rand() * 0.8, () => {
          leaf(ctx, len, len * (0.34 + rand() * 0.16), fill)
        })
      }
    })
  }

  builder.add('branch:0', BRANCH_CELL.w, BRANCH_CELL.h, ctx => {
    const dark = '#22421f'
    branch(
      ctx,
      [
        [-200, -110],
        [-120, -70],
        [-40, -30],
        [40, 6],
        [120, 28],
        [196, 36],
      ],
      9,
      3,
      dark,
    )
    branch(ctx, [[-60, -42], [-30, 6], [4, 54], [30, 96]], 5, 2, dark)
    branch(ctx, [[70, 14], [96, 52], [110, 92]], 4.5, 1.8, dark)
    branch(ctx, [[-140, -84], [-118, -38], [-104, 6]], 4, 1.6, dark)
  })
}

export interface LeafClusterSpec {
  kind: number
  x: number
  y: number
  rot: number
  scale: number
  phase: number
}

export class TreeLayer implements SceneLayer {
  readonly object = new THREE.Group()
  private readonly clusters: Array<{ mesh: THREE.Mesh; spec: LeafClusterSpec }> = []
  private readonly branches: Array<{ mesh: THREE.Mesh; phase: number; rot: number }> = []
  private readonly geometries: THREE.BufferGeometry[] = []

  constructor(atlas: Atlas, material: THREE.Material, specs: LeafClusterSpec[]) {
    this.object.renderOrder = LAYER_ORDER.branch

    // Ветви уходят из-за правого верхнего угла, поворотная точка - у края кадра.
    const branchGeo = planeFor(atlas, 'branch:0', BRANCH_CELL.w / PPU, BRANCH_CELL.h / PPU)
    branchGeo.translate(BRANCH_CELL.w / PPU / 2, 0, 0)
    this.geometries.push(branchGeo)
    const branchMesh = new THREE.Mesh(branchGeo, material)
    branchMesh.position.set(6.9, 3.15, 0)
    branchMesh.rotation.z = 0.12
    branchMesh.renderOrder = LAYER_ORDER.branch
    this.object.add(branchMesh)
    this.branches.push({ mesh: branchMesh, phase: 0.4, rot: 0.12 })

    for (const spec of specs) {
      const geo = planeFor(atlas, `leafcluster:${spec.kind}`, CLUSTER_CELL / PPU, CLUSTER_CELL / PPU)
      this.geometries.push(geo)
      const mesh = new THREE.Mesh(geo, material)
      mesh.position.set(spec.x, spec.y, 0)
      mesh.rotation.z = spec.rot
      mesh.scale.setScalar(spec.scale)
      mesh.renderOrder = LAYER_ORDER.branch + 0.1
      this.object.add(mesh)
      this.clusters.push({ mesh, spec })
    }
  }

  update(_dt: number, wind: WindState, pointer: PointerState): void {
    const px = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.branch
    const py = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.branch

    for (const b of this.branches) {
      // Ветка качается от закреплённого конца - как настоящая, а не плывёт.
      b.mesh.rotation.z = b.rot + windAt(wind, 8, 3, b.phase) * 0.012
      b.mesh.position.x = 6.9 + px
      b.mesh.position.y = 3.15 + py
    }

    for (const { mesh, spec } of this.clusters) {
      const w = windAt(wind, spec.x, spec.y, spec.phase)
      mesh.rotation.z = spec.rot + w * 0.035
      mesh.position.x = spec.x + px + w * 0.03
      mesh.position.y = spec.y + py + w * 0.018
      mesh.scale.setScalar(spec.scale * (1 + Math.sin(wind.time * 0.53 + spec.phase) * 0.012))
    }
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose()
    this.geometries.length = 0
    this.object.clear()
  }
}

/** Кластеры сидят в правом верхнем углу и частично выходят за кадр. */
export function layoutLeafClusters(count: number): LeafClusterSpec[] {
  const rand = rng(9110)
  const out: LeafClusterSpec[] = []
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    out.push({
      kind: Math.floor(rand() * CLUSTER_KINDS),
      x: 3.4 + t * 3.5 + (rand() - 0.5) * 1.2,
      y: 3.9 - Math.pow(t, 1.5) * 2.9 + (rand() - 0.5) * 0.9,
      rot: rand() * Math.PI * 2,
      scale: 0.6 + rand() * 0.65,
      phase: rand() * Math.PI * 2,
    })
  }
  return out
}
