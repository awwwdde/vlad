import type * as THREE from 'three'

/** Прямоугольник в атласе, в пикселях исходного канваса. */
export interface AtlasRect {
  x: number
  y: number
  w: number
  h: number
}

/** Готовый атлас: одна текстура плюс карта областей. */
export interface Atlas {
  texture: THREE.Texture
  size: number
  rects: Record<string, AtlasRect>
}

/** Состояние ветра на текущем кадре. Общее для всех слоёв, чтобы листва,
 *  трава, тени и частицы качались согласованно, а не каждая сама по себе. */
export interface WindState {
  /** Время сцены в секундах (стоит на месте при reduced motion). */
  time: number
  /** Базовое направление и сила порыва, -1..1. */
  x: number
  y: number
  /** Огибающая порыва 0..1: ветер то стихает, то усиливается. */
  gust: number
}

/** Нормализованное положение курсора относительно центра сцены, -0.5..0.5. */
export interface PointerState {
  x: number
  y: number
}

/** Слой сцены. Каждый живёт своей жизнью, но получает общий ветер и курсор. */
export interface SceneLayer {
  /** Корневой объект слоя, добавляется в сцену. */
  readonly object: THREE.Object3D
  /** Кадр анимации. dt в секундах. */
  update(dt: number, wind: WindState, pointer: PointerState): void
  /** Освобождение geometry/material/texture, созданных слоем. */
  dispose(): void
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
