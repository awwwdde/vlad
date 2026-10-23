'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

export function AboutReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, transform: 'translateY(18px)' }} whileInView={{ opacity: 1, transform: 'translateY(0)' }} viewport={{ once: true, amount: .15 }} transition={{ duration: .5, delay, ease: [.23, 1, .32, 1] }}>{children}</motion.div>
}
