import { motion } from 'framer-motion'

const SKILLS = [
  'React',
  'TypeScript',
  'Tailwind CSS',
  'GSAP',
  'Framer Motion',
  'Lenis',
  'Vite',
  'Figma',
  'UI Design',
  'Motion Design',
]

interface MarqueeRowProps {
  speed?: number
  reverse?: boolean
}

export function MarqueeRow({ speed = 25, reverse = false }: MarqueeRowProps): JSX.Element {
  const items = [...SKILLS, ...SKILLS]

  return (
    <div className="w-full overflow-hidden border-y border-black/10 py-4">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: reverse ? ['0%', '50%'] : ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
      >
        {items.map((skill, index) => (
          <span
            key={`${skill}-${index}`}
            className="flex flex-shrink-0 items-center gap-8 font-mono text-caption uppercase tracking-widest text-muted"
          >
            {skill}
            <span className="text-lg text-mint">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
