'use client'

import { motion, useReducedMotion } from 'framer-motion'

/** Общая кривая появления по сайту: быстрый старт, длинный выкат.
 *  Движение читается как «встало на место», а не как равномерный проезд. */
export const HERO_EASE = [0.16, 1, 0.3, 1] as const

/**
 * Заголовок, проявляющийся по словам.
 *
 * Каждое слово едет из-под собственной маски: перекрытие обрезано по строке,
 * поэтому буквы выходят снизу, а не проступают из пустоты. Порядок слов задаёт
 * порядок чтения - ради этого приём и нужен, а не ради самого движения.
 *
 * Маска висит на слове, а не на строке целиком: заголовок переносится сам, и
 * заранее знать, где будет разрыв, нельзя.
 */
export function RevealWords({
  text,
  className,
  delay = 0,
  stagger = 0.055,
  inView = false,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
  /** Для заголовков ниже первого экрана: ждём появления во вьюпорте, иначе
   *  анимация отыграет в пустоту, пока до неё не долистали. */
  inView?: boolean
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  const play = { y: '0%' }

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          // Маска чуть выше строки: у шрифта есть выносные элементы, и по
          // ровному краю у букв срезало бы низ.
          className="inline-block overflow-hidden pb-[0.12em] align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={reduce ? false : { y: '105%' }}
            {...(inView
              ? {
                  whileInView: play,
                  // Порог низкий и с запасом сверху: на узком экране
                  // заголовок в две-три строки может не набрать большую
                  // долю видимости, и текст остался бы скрытым навсегда.
                  viewport: { once: true, amount: 0.3, margin: '0px 0px -10% 0px' },
                }
              : { animate: play })}
            transition={{ duration: 0.85, delay: delay + i * stagger, ease: HERO_EASE }}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/** Простое появление блока на монтировании: сдвиг на несколько пикселей плюс
 *  прозрачность. Для подписей этого достаточно, слова там дробить незачем. */
export function RevealOnMount({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const reduce = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: HERO_EASE }}
    >
      {children}
    </motion.div>
  )
}
