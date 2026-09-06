/**
 * Примитивы рисования на 2D-канвасе.
 *
 * Вся графика сцены рисуется здесь и уходит в Three.js текстурами. Причина
 * простая: нужна плоская векторная иллюстрация с органическими формами, а не
 * трёхмерная геометрия. Canvas2D даёт кривые Безье и заливки напрямую, тогда
 * как собирать те же силуэты из треугольников пришлось бы вручную и дольше.
 */

export type Ctx = CanvasRenderingContext2D

/** Скруглённый прямоугольник вокруг центра (0,0). */
export function roundRect(
  ctx: Ctx,
  w: number,
  h: number,
  r: number,
  fill: string,
): void {
  const x = -w / 2
  const y = -h / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Эллипс вокруг центра. */
export function ellipse(ctx: Ctx, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, rot, 0, Math.PI * 2)
  ctx.fillStyle = fill
  ctx.fill()
}

/**
 * Органическая клякса: окружность, радиус которой гуляет по нескольким
 * гармоникам. Именно она даёт «листовые» силуэты теней и крон - ровный круг
 * читался бы как геометрия, а не как растительность.
 */
export function blob(
  ctx: Ctx,
  radius: number,
  wobble: number,
  points: number,
  rand: () => number,
  fill: string,
): void {
  const amps = [wobble, wobble * 0.55, wobble * 0.3]
  const phases = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2]
  const freqs = [3 + Math.floor(rand() * 3), 5 + Math.floor(rand() * 4), 9 + Math.floor(rand() * 5)]

  ctx.beginPath()
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2
    let r = radius
    for (let k = 0; k < 3; k++) r += Math.sin(a * freqs[k] + phases[k]) * radius * amps[k]
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Лист: два дугообразных края, сходящихся в кончик. */
export function leaf(ctx: Ctx, len: number, width: number, fill: string): void {
  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  ctx.quadraticCurveTo(0, -width / 2, len / 2, 0)
  ctx.quadraticCurveTo(0, width / 2, -len / 2, 0)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/** Скруглённая капсула по двум точкам: руки, ноги, ветки. */
export function limb(
  ctx: Ctx,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  thickness: number,
  fill: string,
): void {
  ctx.beginPath()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = thickness
  ctx.strokeStyle = fill
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** Ветка: кривая переменной толщины, нарисованная как ломаная-оболочка. */
export function branch(
  ctx: Ctx,
  pts: Array<[number, number]>,
  from: number,
  to: number,
  fill: string,
): void {
  const left: Array<[number, number]> = []
  const right: Array<[number, number]> = []
  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1)
    const th = from + (to - from) * t
    const prev = pts[Math.max(0, i - 1)]
    const next = pts[Math.min(pts.length - 1, i + 1)]
    const dx = next[0] - prev[0]
    const dy = next[1] - prev[1]
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    left.push([pts[i][0] + nx * th, pts[i][1] + ny * th])
    right.push([pts[i][0] - nx * th, pts[i][1] - ny * th])
  }
  ctx.beginPath()
  ctx.moveTo(left[0][0], left[0][1])
  for (const p of left.slice(1)) ctx.lineTo(p[0], p[1])
  for (const p of right.reverse()) ctx.lineTo(p[0], p[1])
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

/**
 * Бумажное зерно. Кладётся последним слоем поверх заливок и снимает с них
 * цифровую стерильность: без него плоские заливки выглядят как залитый
 * вектор, а не как печатная иллюстрация.
 */
export function grain(
  ctx: Ctx,
  w: number,
  h: number,
  rand: () => number,
  amount = 0.05,
): void {
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue
    const n = (rand() - 0.5) * 255 * amount
    d[i] = clamp(d[i] + n)
    d[i + 1] = clamp(d[i + 1] + n)
    d[i + 2] = clamp(d[i + 2] + n)
  }
  ctx.putImageData(img, 0, 0)
}

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}

/** Канвас нужного размера. Отдельная функция - чтобы не забыть про willReadFrequently
 *  там, где потом читаем пиксели под зерно. */
export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2D context unavailable')
  return { canvas, ctx }
}

/** Рисование в локальной системе координат: сохранение стека без ручных restore. */
export function at(ctx: Ctx, x: number, y: number, rot: number, fn: () => void): void {
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  fn()
  ctx.restore()
}
