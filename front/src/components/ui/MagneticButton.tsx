/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useMagnetic } from '@/hooks/useMagnetic'
import { useCursor } from '@/context/CursorContext'

interface Props {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'dark' | 'outline' | 'lav'
  className?: string
  type?: 'button' | 'submit'
}

const variants = {
  dark:    'bg-ink text-white hover:bg-lav hover:text-ink',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-white',
  lav:     'bg-lav text-ink hover:bg-lav-dark',
}

export function MagneticButton({
  children,
  href,
  onClick,
  variant = 'dark',
  className,
  type = 'button'
}: Props) {
  const { ref, x, y, onMove, onLeave } = useMagnetic()
  const { set } = useCursor()
  const Tag = href ? 'a' : 'button'

  return (
    <motion.div style={{ x, y }} className="inline-block">
      <Tag
        ref={ref as any}
        href={href}
        onClick={onClick}
        type={Tag === 'button' ? type : undefined}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={() => set('pointer')}
        className={`
          inline-flex items-center px-6 py-3 rounded-full font-sans font-semibold
          text-[clamp(13px,0.9vw,16px)] transition-colors duration-300
          ${variants[variant]} ${className ?? ''}
        `}
      >
        {children}
      </Tag>
    </motion.div>
  )
}
