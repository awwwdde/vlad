import * as THREE from 'three'
import { AtlasBuilder, planeFor } from './atlas'
import { at, ellipse, limb, roundRect } from './draw'
import { LAYER_ORDER, PALETTE, PARALLAX_DEPTH, PARALLAX_RANGE, rng } from './config'
import { DEV_SIZE, type DevKind } from './DevObject'
import type { Atlas, PointerState, SceneLayer, WindState } from './types'

/** Пикселей канваса на единицу мира для фигур. */
const PPU = 190

export type HairStyle = 'short' | 'bun' | 'long'

export interface PersonSpec {
  id: string
  /** Позиция в единицах мира. */
  x: number
  y: number
  /** Разворот фигуры, радианы. Вид сверху, поэтому вращаем свободно. */
  rot: number
  scale: number
  shirt: string
  pants: string
  skin: string
  hair: HairStyle
  /** Фазовый сдвиг idle-анимации: люди не должны дышать в такт. */
  phase: number
  /** Устройство в руках. Живёт внутри группы фигуры, а не отдельным объектом
   *  сцены: только так оно поворачивается и едет вместе с человеком. */
  device: DevKind
  deviceScale: number
}

const CELL = {
  shadowW: 132,
  shadowH: 116,
  headW: 72,
  headH: 78,
  torsoW: 100,
  torsoH: 108,
  armW: 34,
  armH: 120,
  legsW: 116,
  legsH: 96,
}

/** Рука и нога рисуются двумя звеньями со сгибом: одна прямая капсула читается
 *  палкой, а излом на локте или колене сразу даёт живое тело. */
function jointed(
  ctx: CanvasRenderingContext2D,
  a: [number, number],
  b: [number, number],
  c: [number, number],
  thick: number,
  fill: string,
): void {
  limb(ctx, a[0], a[1], b[0], b[1], thick, fill)
  limb(ctx, b[0], b[1], c[0], c[1], thick * 0.86, fill)
}

/**
 * Рисует детали одной фигуры в атлас. Части лежат отдельными ячейками, потому
 * что каждая должна двигаться сама: грудь дышит, голова ведёт, руки работают.
 * Перерисовывать фигуру целиком каждый кадр было бы дороже на два порядка.
 */
export function registerPerson(builder: AtlasBuilder, spec: PersonSpec): void {
  const { id, shirt, pants, skin, hair } = spec

  // Тень под фигурой. Без неё человек висит над газоном наклейкой; с ней он
  // на нём сидит. Тень лежит отдельной ячейкой и не дышит вместе с корпусом.
  builder.add(`${id}:shadow`, CELL.shadowW, CELL.shadowH, ctx => {
    ctx.globalAlpha = 0.13
    at(ctx, 4, 10, 0.15, () => ellipse(ctx, 50, 40, '#20360f'))
    ctx.globalAlpha = 0.1
    at(ctx, 10, 18, 0.15, () => ellipse(ctx, 42, 30, '#20360f'))
    ctx.globalAlpha = 1
  })

  // Голова сверху: волосы почти целиком, снизу выглядывает лоб.
  builder.add(`${id}:head`, CELL.headW, CELL.headH, ctx => {
    if (hair === 'long') {
      at(ctx, 0, 11, 0, () => ellipse(ctx, 21, 21, PALETTE.hair))
    }
    if (hair === 'bun') {
      at(ctx, 0, -17, 0, () => ellipse(ctx, 9, 8, PALETTE.hair))
    }
    at(ctx, 0, 2, 0, () => ellipse(ctx, 18, 17, skin))
    // Шапка волос со сдвигом вверх: снизу остаётся полоска лба, и голова
    // читается как повёрнутая макушкой к зрителю.
    at(ctx, 0, -3, 0, () => ellipse(ctx, 19, 17, PALETTE.hair))
    at(ctx, 0, 8, 0, () => {
      ctx.beginPath()
      ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI)
      ctx.fillStyle = skin
      ctx.fill()
    })
    // Уши: две точки по краям, без них силуэт слишком геометричный.
    at(ctx, -18, 4, 0, () => ellipse(ctx, 3.5, 4.5, skin))
    at(ctx, 18, 4, 0, () => ellipse(ctx, 3.5, 4.5, skin))
  })

  // Торс: покатые плечи, сужение к тазу, воротник.
  builder.add(`${id}:torso`, CELL.torsoW, CELL.torsoH, ctx => {
    ctx.beginPath()
    ctx.moveTo(-30, -18)
    ctx.quadraticCurveTo(-36, 6, -26, 32)
    ctx.quadraticCurveTo(0, 42, 26, 32)
    ctx.quadraticCurveTo(36, 6, 30, -18)
    ctx.quadraticCurveTo(18, -32, 0, -32)
    ctx.quadraticCurveTo(-18, -32, -30, -18)
    ctx.closePath()
    ctx.fillStyle = shirt
    ctx.fill()

    // Воротник вокруг шеи и мягкая тень по низу: плоское пятно получает объём,
    // но без градиентов.
    ctx.globalAlpha = 0.16
    at(ctx, 0, -24, 0, () => ellipse(ctx, 13, 8, '#000000'))
    ctx.globalAlpha = 0.08
    at(ctx, 0, 28, 0, () => ellipse(ctx, 26, 10, '#000000'))
    ctx.globalAlpha = 1
  })

  // Рука со сгибом в локте. Поворотная точка - верхний край ячейки.
  builder.add(`${id}:arm`, CELL.armW, CELL.armH, ctx => {
    const top = -CELL.armH / 2 + 6
    const bottom = CELL.armH / 2 - 12
    jointed(ctx, [0, top], [-7, (top + bottom) / 2], [5, bottom], 12, shirt)
    ctx.globalAlpha = 0.13
    jointed(ctx, [0, top], [-7, (top + bottom) / 2], [5, bottom], 12, '#000000')
    ctx.globalAlpha = 1
    at(ctx, 5, bottom + 4, 0, () => ellipse(ctx, 7.5, 6.5, skin))
  })

  // Ноги скрещены: бедро уходит в сторону, голень заворачивает обратно к оси.
  builder.add(`${id}:legs`, CELL.legsW, CELL.legsH, ctx => {
    jointed(ctx, [-12, -30], [-38, 6], [-8, 30], 20, pants)
    jointed(ctx, [12, -30], [37, 2], [6, 26], 20, pants)
    at(ctx, -6, 33, -0.3, () => roundRect(ctx, 20, 12, 6, PALETTE.cream))
    at(ctx, 8, 29, 0.35, () => roundRect(ctx, 20, 12, 6, PALETTE.cream))
  })
}

/** Индивидуальная моторика. Частоты у каждого свои и между собой несоизмеримы,
 *  поэтому фигуры никогда не попадают в общий такт. */
interface Motion {
  breathRate: number
  breathAmp: number
  headRate: number
  headAmp: number
  armRateL: number
  armRateR: number
  armAmpL: number
  armAmpR: number
  /** Медленная смена позы: раз в десяток секунд человек переминается. */
  postureRate: number
  postureAmp: number
}

function motionFor(index: number, device: DevKind): Motion {
  const rand = rng(1200 + index * 977)
  // Занятие задаёт характер: за клавиатурой руки частят мелко, с планшетом и
  // блокнотом ведут крупнее и медленнее, с телефоном работает в основном одна.
  const typing = device === 'laptop' || device === 'monitor'
  const base = typing ? 2.2 : 1.2
  const amp = typing ? 0.045 : 0.085
  const oneHanded = device === 'phone'

  return {
    breathRate: 0.95 + rand() * 0.55,
    breathAmp: 0.009 + rand() * 0.008,
    headRate: 0.38 + rand() * 0.42,
    headAmp: 0.04 + rand() * 0.05,
    armRateL: base * (0.82 + rand() * 0.45),
    armRateR: base * (0.82 + rand() * 0.45),
    armAmpL: amp * (0.7 + rand() * 0.6),
    armAmpR: (oneHanded ? amp * 0.25 : amp) * (0.7 + rand() * 0.6),
    postureRate: 0.09 + rand() * 0.1,
    postureAmp: 0.02 + rand() * 0.035,
  }
}

interface PersonParts {
  group: THREE.Group
  body: THREE.Group
  torso: THREE.Mesh
  head: THREE.Mesh
  armL: THREE.Mesh
  armR: THREE.Mesh
  spec: PersonSpec
  motion: Motion
}

const ARM_REST = 0.5

export class PeopleLayer implements SceneLayer {
  readonly object = new THREE.Group()
  private readonly people: PersonParts[] = []
  private readonly geometries: THREE.BufferGeometry[] = []

  constructor(atlas: Atlas, material: THREE.Material, specs: PersonSpec[]) {
    this.object.renderOrder = LAYER_ORDER.person

    specs.forEach((spec, index) => {
      const group = new THREE.Group()
      group.position.set(spec.x, spec.y, 0)
      group.rotation.z = spec.rot
      group.scale.setScalar(spec.scale)

      // Тень лежит в группе, но вне body: она на траве и не должна повторять
      // покачивание корпуса.
      const shadow = this.mesh(atlas, material, `${spec.id}:shadow`, CELL.shadowW, CELL.shadowH)
      shadow.position.y = -0.12
      shadow.renderOrder = LAYER_ORDER.person - 0.1

      const body = new THREE.Group()

      const legs = this.mesh(atlas, material, `${spec.id}:legs`, CELL.legsW, CELL.legsH)
      legs.position.y = -0.34

      const torso = this.mesh(atlas, material, `${spec.id}:torso`, CELL.torsoW, CELL.torsoH)

      const armL = this.pivoted(atlas, material, `${spec.id}:arm`, CELL.armW, CELL.armH)
      armL.position.set(-0.22, 0.06, 0)
      armL.rotation.z = ARM_REST
      const armR = this.pivoted(atlas, material, `${spec.id}:arm`, CELL.armW, CELL.armH)
      armR.position.set(0.22, 0.06, 0)
      armR.rotation.z = -ARM_REST
      // Зеркалим правую руку, чтобы сгиб локтя смотрел наружу с обеих сторон.
      armR.scale.x = -1

      const head = this.mesh(atlas, material, `${spec.id}:head`, CELL.headW, CELL.headH)
      head.position.y = 0.32

      // Устройство лежит перед фигурой ровно там, куда дотягиваются руки.
      const [dw, dh] = DEV_SIZE[spec.device]
      const device = this.mesh(atlas, material, `dev:${spec.device}`, dw, dh)
      device.position.set(0, -0.44, 0)
      device.scale.setScalar(spec.deviceScale * 0.62)

      legs.renderOrder = LAYER_ORDER.person
      device.renderOrder = LAYER_ORDER.person + 0.05
      torso.renderOrder = LAYER_ORDER.person + 0.1
      armL.renderOrder = LAYER_ORDER.person + 0.2
      armR.renderOrder = LAYER_ORDER.person + 0.2
      head.renderOrder = LAYER_ORDER.person + 0.3

      body.add(legs, device, torso, armL, armR, head)
      group.add(shadow, body)
      this.object.add(group)
      this.people.push({
        group,
        body,
        torso,
        head,
        armL,
        armR,
        spec,
        motion: motionFor(index, spec.device),
      })
    })
  }

  private mesh(
    atlas: Atlas,
    material: THREE.Material,
    key: string,
    w: number,
    h: number,
  ): THREE.Mesh {
    const geo = planeFor(atlas, key, w / PPU, h / PPU)
    this.geometries.push(geo)
    return new THREE.Mesh(geo, material)
  }

  /** Плоскость с поворотной точкой у верхнего края: нужна рукам, чтобы они
   *  вращались от плеча, а не от середины предплечья. */
  private pivoted(
    atlas: Atlas,
    material: THREE.Material,
    key: string,
    w: number,
    h: number,
  ): THREE.Mesh {
    const geo = planeFor(atlas, key, w / PPU, h / PPU)
    geo.translate(0, -h / PPU / 2, 0)
    this.geometries.push(geo)
    return new THREE.Mesh(geo, material)
  }

  update(_dt: number, wind: WindState, pointer: PointerState): void {
    const t = wind.time
    // Люди сидят на траве и едут ровно с ней: собственного параллакса у них
    // нет. Иначе фигуры отклеиваются от газона и плывут над ним, как листва.
    const px = pointer.x * PARALLAX_RANGE * PARALLAX_DEPTH.ground
    const py = pointer.y * PARALLAX_RANGE * PARALLAX_DEPTH.ground

    for (const p of this.people) {
      const ph = p.spec.phase
      const m = p.motion

      // Дыхание: корпус чуть раздаётся. Меньше процента - на глаз это не
      // движение, а признак того, что фигура живая.
      const breath = Math.sin(t * m.breathRate + ph) * m.breathAmp
      p.torso.scale.set(1 + breath, 1 + breath * 1.4, 1)

      // Голова ведёт своим темпом, медленнее рук.
      p.head.rotation.z = Math.sin(t * m.headRate + ph * 1.7) * m.headAmp
      p.head.position.y = 0.32 + Math.sin(t * m.breathRate + ph) * 0.004

      // Руки работают независимо: у каждой своя частота и своя амплитуда,
      // поэтому они не читаются одним зеркальным механизмом.
      p.armL.rotation.z = ARM_REST + Math.sin(t * m.armRateL + ph) * m.armAmpL
      p.armR.rotation.z = -ARM_REST + Math.sin(t * m.armRateR + ph * 1.9 + 1.1) * m.armAmpR

      // Смена позы: очень медленный доворот всего корпуса. Именно он не даёт
      // фигуре читаться зацикленным спрайтом.
      p.body.rotation.z = Math.sin(t * m.postureRate + ph) * m.postureAmp
      p.body.position.y = Math.sin(t * m.postureRate * 1.7 + ph) * 0.006

      p.group.position.x = p.spec.x + px
      p.group.position.y = p.spec.y + py
    }
  }

  dispose(): void {
    for (const geo of this.geometries) geo.dispose()
    this.geometries.length = 0
    this.object.clear()
  }
}
