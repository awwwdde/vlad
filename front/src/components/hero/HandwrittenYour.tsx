'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { HERO_EASE } from './RevealText'

/**
 * Слово «your» рукописной прописью, нарисованное путями.
 *
 * Почему не шрифт: слово должно тянуться на всю оставшуюся ширину строки, а
 * растянутый шрифт мгновенно выдаёт себя раздутыми овалами и штрихами разной
 * толщины. У обводки такой проблемы нет: `vector-effect: non-scaling-stroke`
 * держит перо одной толщины при любом масштабе по X, поэтому буквы можно
 * растягивать сколько угодно, и они остаются написанными от руки.
 *
 * `preserveAspectRatio="none"` здесь не побочный эффект, а весь смысл: высота
 * задаётся строкой, ширина - остатком места, буквы тянутся между ними.
 */

/** Штрихи в порядке письма. Каждый идёт со своей задержкой, поэтому слово не
 *  проявляется целиком, а пишется слева направо. */
const STROKES: Array<{ d: string; at: number; dur: number }> = [
  // y: дуга и подстрочная петля, уходящая вправо в связку с o
  { d: 'M16 36 C16 66 26 82 44 82 C62 82 72 64 74 36', at: 0, dur: 0.42 },
  {
    d: 'M74 36 C72 70 70 96 58 110 C48 122 28 120 26 108 C24 98 40 92 62 88 C82 84 96 80 108 72',
    at: 0.3,
    dur: 0.5,
  },
  // o: петля, замкнутая с выходом вправо
  {
    d: 'M108 72 C114 46 132 30 150 34 C166 38 172 58 158 72 C144 86 124 82 121 67 C118 51 140 39 164 45 C182 50 194 58 200 70',
    at: 0.7,
    dur: 0.5,
  },
  // u: два подъёма с общей связкой
  {
    d: 'M200 70 C206 48 213 38 221 40 C228 42 226 58 223 70 C220 82 226 88 237 85 C250 81 258 62 262 40',
    at: 1.08,
    dur: 0.4,
  },
  { d: 'M262 40 C258 62 257 78 265 84 C273 90 284 82 293 68', at: 1.36, dur: 0.28 },
  // r: подъём, завиток вниз и короткое ухо вверх-вправо. Ухо обрывается
  // высоко и не доводится до строки - иначе вторая дуга читается как n.
  {
    d: 'M293 68 C300 45 307 33 313 36 C319 39 317 52 312 66 C317 50 330 39 345 42 C352 44 356 47 358 51',
    at: 1.56,
    dur: 0.42,
  },
]

export function HandwrittenYour({
  className,
  /** Задержка до первого штриха, секунды. */
  delay = 0,
}: {
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()

  return (
    <svg
      viewBox="0 0 420 130"
      preserveAspectRatio="none"
      fill="none"
      className={className}
      role="img"
      aria-label="your"
    >
      <g
        stroke="currentColor"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      >
        {STROKES.map((s, i) => (
          <motion.path
            key={i}
            d={s.d}
            // pathLength Motion переводит в штриховку по длине контура: перо
            // проходит путь, а не проявляется целиком.
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: s.dur, delay: delay + s.at, ease: HERO_EASE }}
          />
        ))}
      </g>
    </svg>
  )
}
