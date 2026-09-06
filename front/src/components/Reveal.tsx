'use client'

import { motion, useReducedMotion } from 'framer-motion'

/** Появление блока при входе во вьюпорт. Задача одна: задать порядок чтения
 *  внутри секции, поэтому сдвиг маленький и однократный. При
 *  prefers-reduced-motion анимация не проигрывается вовсе. */
export function Reveal({
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
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
