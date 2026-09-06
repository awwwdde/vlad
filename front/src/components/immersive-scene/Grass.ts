import * as THREE from 'three'
import { AtlasBuilder, planeFor } from './atlas'
import { at, ellipse, grain, leaf, limb, makeCanvas } from './draw'
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
const BLADE_KINDS = ['blade:a', 'blade:b', 'blade:c'] as const

/**
 * Фон поляны. Отдельная текстура, а не ячейка атласа: подложка занимает весь
 * кадр, и класть её в общий атлас значило бы отдать ему половину площади.
 */
export function makeGrassTexture(): { texture: THREE.CanvasTexture; dispose(): void } {
  const w = 1024
  const h = Math.round((w * WORLD.height) / WORLD.width)
  const { canvas, ctx } = makeCanvas(w, h)
  const rand = rng(20260906)

  ctx.fillStyle = PALETTE.grass
  ctx.fillRect(0, 0, w, h)

  // Мягкие пятна разной светлоты: газон не бывает одного тона, но переходы
  // должны оставаться плоскими, без градиентной «плёнки».
  for (let i = 0; i < 26; i++) {
    const cx = rand() * w
    const cy = rand() * h
    const r = 90 + rand() * 260
    ctx.globalAlpha = 0.05 + rand() * 0.05
    ctx.fillStyle = rand() > 0.5 ? PALETTE.grassLight : PALETTE.grassDeep
    ctx.beginPath()
    ctx.ellipse(cx, cy, r, r * (0.55 + rand() * 0.5), rand() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  grain(ctx, w, h, rand, 0.055)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.needsUpdate = true
  return { texture, dispose: () => texture.dispose() }
}

export class GrassBackground implements SceneLayer {
  readonly object: THREE.Mesh
  private readonly geometry: THREE.PlaneGeometry
  private readonly material: THREE.MeshBasicMaterial
  private readonly texture: THREE.Texture

  constructor() {
    const made = makeGrassTexture()
    this.texture = made.texture
    // Подложка заведомо больше мира: параллакс сдвигает её, и края не должны
    // выезжать в кадр.
    this.geometry = new THREE.PlaneGeometry(WORLD.width * 1.25, WORLD.height * 1.25)
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    })
    this.object = new THREE.Mesh(this.geometry, this.material)
    this.object.renderOrder = LAYER_ORDER.grass
  }

  update(_dt: number, _wind: WindState, pointer: PointerState): void {
    this.object.position.x = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.ground
    this.object.position.y = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.ground
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
  }
}

/** Мелкая растительность: пучки травы, ромашки, опавшие листья. */
export function registerGrassDetails(builder: AtlasBuilder): void {
  builder.add('blade:a', 26, 30, ctx => {
    limb(ctx, 0, 12, -6, -12, 3, PALETTE.blade)
    limb(ctx, 0, 12, 5, -10, 3, PALETTE.blade)
    limb(ctx, 0, 12, 0, -14, 3, PALETTE.blade)
  })
  builder.add('blade:b', 26, 26, ctx => {
    // Ромашка: пять лепестков и точка сердцевины. Приглушена намеренно -
    // на полную яркость белые точки читаются шумом поверх газона.
    ctx.globalAlpha = 0.62
    for (let i = 0; i < 5; i++) {
      at(ctx, 0, 0, (i / 5) * Math.PI * 2, () => {
        at(ctx, 0, -6, 0, () => ellipse(ctx, 3, 5, PALETTE.white))
      })
    }
    ellipse(ctx, 2.4, 2.4, PALETTE.yellow)
    ctx.globalAlpha = 1
  })
  builder.add('blade:c', 26, 20, ctx => {
    at(ctx, 0, 0, 0.5, () => leaf(ctx, 20, 9, PALETTE.leafLight))
  })
}

export interface BladeSpec {
  kind: (typeof BLADE_KINDS)[number]
  x: number
  y: number
  rot: number
  scale: number
  phase: number
}

/**
 * Детали травы через InstancedMesh: сотни одинаковых спрайтов идут одним
 * draw call на вариант, а не сотней отдельных мешей.
 */
export class GrassDetailLayer implements SceneLayer {
  readonly object = new THREE.Group()
  private readonly meshes: THREE.InstancedMesh[] = []
  private readonly specs: BladeSpec[][] = []
  private readonly geometries: THREE.BufferGeometry[] = []
  private readonly dummy = new THREE.Object3D()

  constructor(atlas: Atlas, material: THREE.Material, specs: BladeSpec[]) {
    this.object.renderOrder = LAYER_ORDER.grassDetail

    for (const kind of BLADE_KINDS) {
      const own = specs.filter(s => s.kind === kind)
      if (own.length === 0) continue
      const rect = atlas.rects[kind]
      const geo = planeFor(atlas, kind, rect.w / PPU, rect.h / PPU)
      this.geometries.push(geo)
      const mesh = new THREE.InstancedMesh(geo, material, own.length)
      mesh.frustumCulled = false
      mesh.renderOrder = LAYER_ORDER.grassDetail
      this.object.add(mesh)
      this.meshes.push(mesh)
      this.specs.push(own)
    }
  }

  update(_dt: number, wind: WindState, pointer: PointerState): void {
    const px = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.ground
    const py = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.ground

    for (let m = 0; m < this.meshes.length; m++) {
      const mesh = this.meshes[m]
      const list = this.specs[m]
      for (let i = 0; i < list.length; i++) {
        const s = list[i]
        const w = windAt(wind, s.x, s.y, s.phase)
        this.dummy.position.set(s.x + px + w * 0.01, s.y + py, 0)
        this.dummy.rotation.z = s.rot + w * 0.05
        this.dummy.scale.setScalar(s.scale)
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

/** Раскладка мелочи по поляне. Гуще к краям, реже в свободной зоне под текст. */
export function layoutBlades(count: number, seed: number): BladeSpec[] {
  const rand = rng(seed)
  const out: BladeSpec[] = []
  let guard = 0
  while (out.length < count && guard++ < count * 12) {
    const x = BOUNDS.left + rand() * WORLD.width
    const y = BOUNDS.bottom + rand() * WORLD.height
    // В свободной зоне оставляем только редкие вкрапления.
    const inSafe = x < -0.6 && y > -2.2 && y < 3.4
    if (inSafe && rand() > 0.22) continue
    // Веса: трава - основа, цветы и опавшие листья лишь вкрапления.
    const roll = rand()
    const kind = roll < 0.62 ? BLADE_KINDS[0] : roll < 0.82 ? BLADE_KINDS[1] : BLADE_KINDS[2]
    out.push({
      kind,
      x,
      y,
      rot: (rand() - 0.5) * 0.9,
      scale: 0.7 + rand() * 0.8,
      phase: rand() * Math.PI * 2,
    })
  }
  return out
}
