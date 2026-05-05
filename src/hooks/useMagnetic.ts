import { useRef } from 'react'
import { useSpring } from 'framer-motion'

export function useMagnetic(strength = 0.35) {
  const ref = useRef<HTMLElement>(null)
  const x = useSpring(0, { stiffness: 200, damping: 20, mass: 0.8 })
  const y = useSpring(0, { stiffness: 200, damping: 20, mass: 0.8 })

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((e.clientX - rect.left - rect.width / 2) * strength)
    y.set((e.clientY - rect.top - rect.height / 2) * strength)
  }

  const onLeave = () => {
    x.set(0)
    y.set(0)
  }

  return { ref, x, y, onMove, onLeave }
}
