import * as THREE from 'three'
import { AtlasBuilder, atlasMaterial } from './atlas'
import { SceneCamera } from './Camera'
import { BUDGET, PALETTE, breakpointFor } from './config'
import { DevObjectLayer, registerDevObjects, type DevSpec } from './DevObject'
import { GrassBackground, GrassDetailLayer, layoutBlades, registerGrassDetails } from './Grass'
import { ParticleLayer, registerParticles } from './Particles'
import { PeopleLayer, registerPerson, type PersonSpec } from './Person'
import { ShadowLayer, layoutShadows, registerShadows } from './Shadows'
import { TreeLayer, layoutLeafClusters, registerTree } from './Tree'
import { Wind } from './Wind'
import type { Atlas, PointerState, SceneLayer } from './types'

/**
 * Раскладка людей. Композиция намеренно смещена вправо и вниз: слева и по
 * центру остаётся свободное поле под заголовок героя (см. SAFE_AREA).
 * Порядок в массиве - порядок важности: на узких экранах бюджет срезает хвост.
 */
const PEOPLE: PersonSpec[] = [
  { id: 'p0', x: 4.2, y: 1.6, rot: -0.3, scale: 1.5, shirt: PALETTE.shirtB, pants: PALETTE.pantsB, skin: PALETTE.skin, hair: 'short', phase: 0.0, device: 'laptop', deviceScale: 1 },
  { id: 'p1', x: 5.8, y: -1.9, rot: -0.16, scale: 1.575, shirt: PALETTE.shirtA, pants: PALETTE.pantsA, skin: PALETTE.skinDark, hair: 'bun', phase: 1.1, device: 'monitor', deviceScale: 1.05 },
  { id: 'p2', x: 2.4, y: -0.9, rot: 0.44, scale: 1.425, shirt: PALETTE.shirtA, pants: PALETTE.pantsC, skin: PALETTE.skin, hair: 'short', phase: 2.3, device: 'laptop', deviceScale: 0.95 },
  { id: 'p3', x: 1.4, y: 2.7, rot: 0.16, scale: 1.38, shirt: PALETTE.shirtC, pants: PALETTE.pantsB, skin: PALETTE.skinDark, hair: 'long', phase: 3.4, device: 'tablet', deviceScale: 1 },
  { id: 'p4', x: 6.9, y: 2.6, rot: -0.6, scale: 1.32, shirt: PALETTE.shirtD, pants: PALETTE.pantsA, skin: PALETTE.skin, hair: 'bun', phase: 4.2, device: 'phone', deviceScale: 1.1 },
  { id: 'p5', x: 0.5, y: -3.1, rot: 0.86, scale: 1.35, shirt: PALETTE.shirtD, pants: PALETTE.pantsC, skin: PALETTE.skinDark, hair: 'short', phase: 5.1, device: 'tablet', deviceScale: 0.9 },
  { id: 'p6', x: -2.9, y: -3.5, rot: 0.24, scale: 1.23, shirt: PALETTE.shirtB, pants: PALETTE.pantsA, skin: PALETTE.skin, hair: 'long', phase: 6.0, device: 'laptop', deviceScale: 0.9 },
]

// Рабочие устройства сидят внутри фигур (см. PersonSpec.device). Здесь то,
// что просто разложено вокруг них на траве.
const DEV_OBJECTS: DevSpec[] = [
  { kind: 'wireframe', x: 3.3, y: 2.2, rot: 0.22, scale: 0.9, phase: 2.8 },
  { kind: 'browser', x: 6.9, y: -3.2, rot: -0.14, scale: 0.9, phase: 3.3 },
  { kind: 'sketch', x: 4.6, y: -1.2, rot: 0.3, scale: 0.85, phase: 4.9 },
  { kind: 'card', x: 1.1, y: -2.2, rot: -0.35, scale: 0.9, phase: 4.4 },
  { kind: 'card', x: 5.4, y: 0.5, rot: 0.24, scale: 0.8, phase: 1.4 },
  { kind: 'grid', x: 3.2, y: -3.5, rot: 0.06, scale: 0.9, phase: 5.3 },
  { kind: 'brackets', x: -1.6, y: -3.2, rot: -0.22, scale: 0.85, phase: 5.7 },
  { kind: 'cursor', x: -0.5, y: -1.7, rot: 0.1, scale: 0.9, phase: 6.1 },
  { kind: 'grid', x: -4.0, y: -3.0, rot: -0.1, scale: 0.75, phase: 6.6 },
  { kind: 'sketch', x: 7.2, y: 1.0, rot: -0.2, scale: 0.8, phase: 7.0 },
  { kind: 'wireframe', x: 2.0, y: -4.1, rot: -0.18, scale: 0.8, phase: 0.6 },
  { kind: 'cursor', x: 4.9, y: 3.5, rot: -0.2, scale: 0.8, phase: 2.0 },
  { kind: 'card', x: -2.0, y: -4.2, rot: 0.3, scale: 0.75, phase: 3.1 },
  { kind: 'browser', x: 0.2, y: 3.4, rot: 0.1, scale: 0.72, phase: 1.9 },
]

export interface SceneOptions {
  canvas: HTMLCanvasElement
  width: number
  height: number
  pixelRatio: number
  reducedMotion: boolean
}

/**
 * Сцена целиком. Владеет рендерером, камерой, атласом и слоями; всё, что она
 * создала, она же и освобождает в dispose().
 */
export class ImmersiveSceneCore {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly sceneCamera = new SceneCamera()
  private readonly wind = new Wind()
  private readonly layers: SceneLayer[] = []
  private readonly atlas: Atlas
  private readonly material: THREE.MeshBasicMaterial

  private readonly pointer: PointerState = { x: 0, y: 0 }
  private readonly pointerTarget: PointerState = { x: 0, y: 0 }
  private reducedMotion: boolean

  constructor(opts: SceneOptions) {
    this.reducedMotion = opts.reducedMotion

    this.renderer = new THREE.WebGLRenderer({
      canvas: opts.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(new THREE.Color(PALETTE.grass), 1)
    // Больше двойной плотности не даёт видимого выигрыша, а стоимость кадра
    // растёт квадратично.
    this.renderer.setPixelRatio(Math.min(opts.pixelRatio, 2))
    this.renderer.setSize(opts.width, opts.height, false)

    const budget = BUDGET[breakpointFor(opts.width)]

    // Атлас собирается один раз: все спрайты сцены живут в одной текстуре и
    // делят один материал.
    const builder = new AtlasBuilder(2048)
    for (const spec of PEOPLE.slice(0, budget.people)) registerPerson(builder, spec)
    registerDevObjects(builder)
    registerGrassDetails(builder)
    registerShadows(builder)
    registerTree(builder)
    registerParticles(builder)
    this.atlas = builder.build()
    this.material = atlasMaterial(this.atlas)

    const grass = new GrassBackground()
    const details = new GrassDetailLayer(
      this.atlas,
      this.material,
      layoutBlades(budget.blades, 5150),
    )
    const shadows = new ShadowLayer(this.atlas, this.material, layoutShadows())
    const devices = new DevObjectLayer(
      this.atlas,
      this.material,
      DEV_OBJECTS.slice(0, budget.devObjects),
    )
    const people = new PeopleLayer(this.atlas, this.material, PEOPLE.slice(0, budget.people))
    const tree = new TreeLayer(this.atlas, this.material, layoutLeafClusters(budget.leafClusters))
    const particles = new ParticleLayer(this.atlas, this.material, budget.particles)

    this.layers.push(grass, details, shadows, devices, people, tree, particles)
    for (const layer of this.layers) this.scene.add(layer.object)

    this.resize(opts.width, opts.height, opts.pixelRatio)
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.renderer.setPixelRatio(Math.min(pixelRatio, 2))
    this.renderer.setSize(width, height, false)
    this.sceneCamera.resize(width, height)
  }

  setPointer(x: number, y: number): void {
    if (this.reducedMotion) return
    this.pointerTarget.x = x
    this.pointerTarget.y = y
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
    if (value) {
      this.pointerTarget.x = 0
      this.pointerTarget.y = 0
    }
  }

  /** Кадр анимации. dt приходит из общего цикла и уже ограничен сверху. */
  frame(dt: number): void {
    // При reduced motion время сцены не идёт: кадр статичен, но рендерится,
    // чтобы ресайз и смена темы отрабатывали корректно.
    const step = this.reducedMotion ? 0 : dt
    const wind = this.wind.advance(step)

    // Курсор подтягивается экспоненциально: при уходе мыши сцена сама
    // возвращается в исходное положение, без отдельной анимации.
    const k = 1 - Math.exp(-dt * 3.2)
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * k
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * k

    for (const layer of this.layers) layer.update(step, wind, this.pointer)
    this.renderer.render(this.scene, this.sceneCamera.camera)
  }

  dispose(): void {
    for (const layer of this.layers) {
      this.scene.remove(layer.object)
      layer.dispose()
    }
    this.layers.length = 0
    this.material.dispose()
    this.atlas.texture.dispose()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
