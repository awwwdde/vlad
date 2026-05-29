import { motion } from 'framer-motion'
import { useSectionCtx } from '@/context/SectionContext'
import { useCursor } from '@/context/CursorContext'

export function SectionDots() {
  const { current, goTo, total } = useSectionCtx()
  const { set } = useCursor()

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          onMouseEnter={() => set('pointer')}
          onMouseLeave={() => set('default')}
          className="w-2 h-2 rounded-full transition-all duration-300 relative"
          style={{ background: current === i ? '#C4B5FD' : 'rgba(0,0,0,0.2)' }}
        >
          {current === i && (
            <motion.span
              layoutId="active-dot"
              className="absolute inset-0 rounded-full bg-lav"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
