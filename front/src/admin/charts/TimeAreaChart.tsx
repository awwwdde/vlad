'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { MetricPoint, MetricSeries } from '@/admin/types'
import { SERIES_DARK, SERIES_LABEL, SERIES_LIGHT, SERIES_ORDER } from './palette'
import { timeFull, timeLabel } from './format'

/**
 * График нагрузки во времени: два ряда (приложение и база) на одной оси.
 *
 * Одна ось - принципиально. Соблазн наложить память на CPU второй шкалой
 * велик, но две шкалы в одном кадре делают взаимное положение линий
 * бессмысленным: их можно подогнать под любой вывод. Поэтому на каждую
 * величину свой график.
 *
 * Рисуется руками на SVG, без библиотеки: рядов два, форма одна, а любой
 * дашборд-кит принёс бы свою типографику и свои отступы, которые пришлось бы
 * переопределять до последнего пикселя.
 */
interface Props {
  title: string
  /** Ряды как их отдал бэкенд; фильтрация по величине - в selector. */
  series: MetricSeries[]
  /** Какую величину точки рисуем. */
  selector: (p: MetricPoint) => number
  /** Формат значения для оси и подсказки. */
  format: (v: number) => string
  stepSeconds: number
  height?: number
  /** Пояснение под заголовком - например, что сеть показана как скорость. */
  hint?: string
}

const PAD = { top: 8, right: 8, bottom: 22, left: 52 }
const GRID_LINES = 4

export function TimeAreaChart({
  title,
  series,
  selector,
  format,
  stepSeconds,
  height = 180,
  hint,
}: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const dark = usePrefersDark()
  const colors = dark ? SERIES_DARK : SERIES_LIGHT
  const [hover, setHover] = useState<number | null>(null)

  // Ширину берём с элемента, а не из viewBox с растяжением: растянутый viewBox
  // деформировал бы подписи вместе с графиком.
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const model = useMemo(() => buildModel(series, selector), [series, selector])

  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const innerH = Math.max(0, height - PAD.top - PAD.bottom)

  const x = (i: number) =>
    PAD.left + (model.times.length < 2 ? innerW / 2 : (i / (model.times.length - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / model.max) * innerH

  const present = SERIES_ORDER.filter(k => model.byKey[k]?.some(v => v !== null))

  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="flex items-baseline justify-between gap-4">
        <div>
          <h4 className="font-ui text-[13px] font-medium tracking-tight text-fg">{title}</h4>
          {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
        </div>
        {/* Легенда есть всегда при двух рядах: различие не должно держаться
            на одном цвете. */}
        <ul className="flex shrink-0 items-center gap-4">
          {present.map(key => (
            <li key={key} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-[3px] w-4 rounded-full"
                style={{ backgroundColor: colors[key].line }}
              />
              <span className="font-ui text-[12px] text-muted">{SERIES_LABEL[key]}</span>
            </li>
          ))}
        </ul>
      </figcaption>

      <div ref={box} className="relative w-full" style={{ height }}>
        {model.times.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-line">
            <span className="text-[13px] text-muted">за этот период данных нет</span>
          </div>
        ) : (
          width > 0 && (
            <svg
              width={width}
              height={height}
              role="img"
              aria-label={title}
              onPointerMove={e => {
                const rect = e.currentTarget.getBoundingClientRect()
                const rel = (e.clientX - rect.left - PAD.left) / Math.max(1, innerW)
                const i = Math.round(rel * (model.times.length - 1))
                setHover(Math.min(model.times.length - 1, Math.max(0, i)))
              }}
              onPointerLeave={() => setHover(null)}
            >
              {/* Сетка приглушена: она ориентир, а не содержание кадра. */}
              {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
                const v = (model.max / GRID_LINES) * i
                return (
                  <g key={i}>
                    <line
                      x1={PAD.left}
                      x2={width - PAD.right}
                      y1={y(v)}
                      y2={y(v)}
                      className="stroke-line"
                      strokeWidth={1}
                    />
                    <text
                      x={PAD.left - 8}
                      y={y(v)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-muted font-ui text-[11px] tabular-nums"
                    >
                      {format(v)}
                    </text>
                  </g>
                )
              })}

              {xTicks(model.times.length).map(i => (
                <text
                  key={i}
                  x={x(i)}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-muted font-ui text-[11px] tabular-nums"
                >
                  {timeLabel(model.times[i], stepSeconds)}
                </text>
              ))}

              {present.map(key => {
                const values = model.byKey[key]
                return (
                  <g key={key}>
                    <path d={areaPath(values, x, y, innerH + PAD.top)} fill={colors[key].fill} />
                    <path
                      d={linePath(values, x, y)}
                      fill="none"
                      stroke={colors[key].line}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )
              })}

              {hover !== null && (
                <g pointerEvents="none">
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={PAD.top}
                    y2={PAD.top + innerH}
                    className="stroke-muted"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  {present.map(key => {
                    const v = model.byKey[key][hover]
                    if (v === null) return null
                    return (
                      // Кольцо цветом поверхности отделяет точку от линии
                      // соседнего ряда, когда они сходятся.
                      <circle
                        key={key}
                        cx={x(hover)}
                        cy={y(v)}
                        r={4}
                        fill={colors[key].line}
                        className="stroke-bg"
                        strokeWidth={2}
                      />
                    )
                  })}
                </g>
              )}
            </svg>
          )
        )}

        {hover !== null && model.times.length > 0 && (
          <div
            className="pointer-events-none absolute z-10 min-w-[132px] rounded-md border border-line bg-bg/95 px-3 py-2 shadow-sm backdrop-blur-sm"
            style={{
              left: Math.min(Math.max(x(hover) + 10, 0), Math.max(0, width - 150)),
              top: 4,
            }}
          >
            <div className="font-ui text-[11px] text-muted">{timeFull(model.times[hover])}</div>
            {present.map(key => (
              <div key={key} className="mt-1 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-[3px] w-3 rounded-full"
                    style={{ backgroundColor: colors[key].line }}
                  />
                  <span className="font-ui text-[12px] text-muted">{SERIES_LABEL[key]}</span>
                </span>
                {/* Значение набрано текстовым цветом: цвет идентичности несёт
                    метка рядом, а не сама цифра. */}
                <span className="font-ui text-[12px] tabular-nums text-fg">
                  {model.byKey[key][hover] === null ? '—' : format(model.byKey[key][hover]!)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Те же данные таблицей - для скринридера и для случая, когда цвет
          недоступен. Визуально скрыта, из потока не выпадает. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>время</th>
            {present.map(k => (
              <th key={k}>{SERIES_LABEL[k]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.times.map((t, i) => (
            <tr key={t}>
              <td>{timeFull(t)}</td>
              {present.map(k => (
                <td key={k}>{model.byKey[k][i] === null ? '—' : format(model.byKey[k][i]!)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

interface Model {
  times: string[]
  byKey: Record<string, Array<number | null>>
  max: number
}

/**
 * Ряды приходят по контейнерам и могут не совпадать по отметкам времени:
 * база могла подняться позже приложения. Сводим их на общую ось, пропуски
 * оставляем дырами - интерполяция нарисовала бы данные, которых не было.
 */
function buildModel(series: MetricSeries[], selector: (p: MetricPoint) => number): Model {
  const times = Array.from(
    new Set(series.flatMap(s => s.points.map(p => p.t))),
  ).sort()
  const index = new Map(times.map((t, i) => [t, i]))

  const byKey: Record<string, Array<number | null>> = {}
  let max = 0
  for (const s of series) {
    const row: Array<number | null> = new Array(times.length).fill(null)
    for (const p of s.points) {
      const v = selector(p)
      row[index.get(p.t)!] = v
      if (v > max) max = v
    }
    byKey[s.container] = row
  }
  for (const key of SERIES_ORDER) {
    if (!byKey[key]) byKey[key] = new Array(times.length).fill(null)
  }

  // Округляем потолок вверх до «круглого», иначе подписи оси выходят вида
  // 37.416 и читать их невозможно.
  return { times, byKey, max: niceMax(max) }
}

/** Ступени округления потолка. Классическая тройка 1-2-5 прыгает слишком
 *  грубо: пик 72 она поднимает до 100, и график теряет четверть высоты
 *  впустую. Промежуточные ступени держат потолок близко к данным, оставаясь
 *  делимыми на четыре линии сетки. */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]

function niceMax(v: number): number {
  if (v <= 0) return 1
  const pow = 10 ** Math.floor(Math.log10(v))
  const norm = v / pow
  const step = NICE_STEPS.find(s => norm <= s) ?? 10
  return step * pow
}

/** Не больше шести подписей на оси: дальше они начинают наезжать. */
function xTicks(count: number): number[] {
  if (count === 0) return []
  const want = Math.min(6, count)
  if (want === 1) return [0]
  const step = (count - 1) / (want - 1)
  return Array.from({ length: want }, (_, i) => Math.round(i * step))
}

/** Ломаная с разрывами на пропусках. */
function linePath(
  values: Array<number | null>,
  x: (i: number) => number,
  y: (v: number) => number,
): string {
  let d = ''
  let open = false
  values.forEach((v, i) => {
    if (v === null) {
      open = false
      return
    }
    d += `${open ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)} `
    open = true
  })
  return d.trim()
}

/** Заливка под ломаной. Каждый непрерывный отрезок закрывается по базовой линии. */
function areaPath(
  values: Array<number | null>,
  x: (i: number) => number,
  y: (v: number) => number,
  baseline: number,
): string {
  let d = ''
  let start = -1
  const close = (end: number) => {
    if (start < 0) return
    d += `L${x(end).toFixed(1)} ${baseline.toFixed(1)} L${x(start).toFixed(1)} ${baseline.toFixed(1)} Z `
    start = -1
  }
  values.forEach((v, i) => {
    if (v === null) {
      close(i - 1)
      return
    }
    if (start < 0) {
      start = i
      d += `M${x(i).toFixed(1)} ${y(v).toFixed(1)} `
    } else {
      d += `L${x(i).toFixed(1)} ${y(v).toFixed(1)} `
    }
  })
  close(values.length - 1)
  return d.trim()
}

/** Тема системы: у графиков свои ступени под тёмный фон.
 *
 *  useSyncExternalStore, а не useState с эффектом: у него есть отдельный
 *  серверный снимок. Чтение matchMedia в инициализаторе useState давало
 *  расхождение гидратации - сервер рисовал светлую палитру, клиент тёмную,
 *  и React ругался на несовпадение атрибутов. Обновление же цвета в эффекте
 *  вместо этого давало вспышку светлых линий на первом кадре. */
const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribeToScheme(onChange: () => void): () => void {
  const mq = window.matchMedia(DARK_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function usePrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeToScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    // На сервере темы нет: отдаём светлую и перерисовываемся после гидратации.
    () => false,
  )
}
