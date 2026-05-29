import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useCursorMove } from '@/hooks/useCursor'
import { useCursor } from '@/context/CursorContext'

const VARIANTS = {
  default: { width: 12,  height: 12,  opacity: 0.8, borderRadius: '50%'   },
  pointer: { width: 40,  height: 40,  opacity: 0.4, borderRadius: '50%'   },
  text:    { width: 2,   height: 28,  opacity: 0.9, borderRadius: '2px'   },
  view:    { width: 72,  height: 72,  opacity: 0.85, borderRadius: '50%'  },
  drag:    { width: 56,  height: 56,  opacity: 0.35, borderRadius: '50%'  },
} as const

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null)
  useCursorMove(ref)
  const { state } = useCursor()

  return (
    <motion.div
      ref={ref}
      className="fixed top-0 left-0 bg-lav border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.25)] pointer-events-none z-[9999]"
      style={{ translateX: '-50%', translateY: '-50%' }}
      animate={VARIANTS[state]}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}
