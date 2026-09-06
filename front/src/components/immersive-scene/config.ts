import type { Breakpoint } from './types'

/**
 * Единственный источник правды по композиции и палитре сцены.
 *
 * Мир сцены измеряется в условных единицах: 16 в ширину, 9 в высоту, центр в
 * нуле. Ортографическая камера подгоняет этот прямоугольник под вьюпорт по
 * принципу cover, поэтому координаты объектов не зависят от размера экрана.
 */
export const WORLD = {
  width: 16,
  height: 9,
} as const

export const BOUNDS = {
  left: -WORLD.width / 2,
  right: WORLD.width / 2,
  bottom: -WORLD.height / 2,
  top: WORLD.height / 2,
} as const

/**
 * Свободная зона под текст героя. Слева и по центру композиция обязана
 * оставаться пустой: там лежит HTML-заголовок. Значения используются при
 * раскладке и проверяются тестовой раскладкой в layoutIsClean().
 */
export const SAFE_AREA = {
  left: BOUNDS.left,
  right: -0.6,
  bottom: -2.2,
  top: 3.4,
} as const

/** Палитра. Плоские заливки, без градиентов и свечения. */
export const PALETTE = {
  grass: '#b3cd2f',
  grassDeep: '#9cb725',
  grassLight: '#c6dc4b',
  blade: '#8aa41f',
  shadow: '#4f7a2b',
  shadowDeep: '#3c6221',
  forest: '#1e5b30',
  leaf: '#2f6b33',
  leafLight: '#5f9a34',
  leafPale: '#a8c94a',
  cream: '#f3efe4',
  white: '#ffffff',
  yellow: '#e6b23c',
  orange: '#e0762f',
  blue: '#9cc2d7',
  ink: '#24301b',
  screen: '#e9e6dc',
  skin: '#e2b48f',
  skinDark: '#c68f66',
  hair: '#2a221f',
  shirtA: '#f4f1ea',
  shirtB: '#e8a93c',
  shirtC: '#1e5b30',
  shirtD: '#9cc2d7',
  pantsA: '#1f4a2a',
  pantsB: '#d9d2bf',
  pantsC: '#2b2f28',
} as const

/** Порядок отрисовки слоёв. Прозрачность сортируется вручную, поэтому глубина
 *  задаётся renderOrder, а не координатой z. */
export const LAYER_ORDER = {
  grass: 0,
  grassDetail: 1,
  treeShadow: 2,
  devObject: 3,
  person: 4,
  branch: 5,
  particle: 6,
} as const

/**
 * Глубина слоя для параллакса.
 *
 * В виде сверху сдвиг от курсора берётся из высоты над землёй, а не из
 * «важности» слоя. Поэтому всё, что лежит на траве - газон, его детали, тени,
 * предметы и сами люди - едет одним и тем же ground: относительно друг друга
 * эти слои неподвижны, и человек остаётся сидеть на своём месте, а не плывёт
 * над поляной. Отдельные значения только у того, что действительно выше:
 * частицы в воздухе и крона над головой.
 */
export const PARALLAX_DEPTH = {
  ground: 0.05,
  particle: 0.45,
  branch: 1,
} as const

/** Максимальный сдвиг параллакса в единицах мира. Держим мягким: сцена должна
 *  дышать, а не ездить за курсором. */
export const PARALLAX_RANGE = 0.55

/** Бюджет объектов по брейкпоинтам. На узких экранах сцена прореживается,
 *  но композиция остаётся той же. */
export const BUDGET: Record<Breakpoint, {
  people: number
  devObjects: number
  blades: number
  particles: number
  leafClusters: number
}> = {
  mobile: { people: 4, devObjects: 7, blades: 90, particles: 14, leafClusters: 7 },
  tablet: { people: 5, devObjects: 10, blades: 150, particles: 20, leafClusters: 10 },
  desktop: { people: 7, devObjects: 14, blades: 220, particles: 28, leafClusters: 14 },
}

export function breakpointFor(width: number): Breakpoint {
  if (width < 768) return 'mobile'
  if (width < 1280) return 'tablet'
  return 'desktop'
}

/** Детерминированный псевдослучайный генератор: раскладка обязана быть
 *  одинаковой на сервере и на клиенте, а также между перезагрузками, иначе
 *  композицию невозможно ни проверить, ни исправить. */
export function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
