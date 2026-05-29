import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  words: string[]
  interval?: number
  className?: string
}

export function WordRotator({ words, interval = 2000, className }: Props) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  return (
    <span className="inline-block overflow-hidden align-bottom relative" style={{ minWidth: '8ch' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          className={`inline-block bg-lav px-[0.18em] rounded-sm text-ink font-sans font-black ${className ?? ''}`}
          initial={{ y: '115%' }}
          animate={{ y: 0 }}
          exit={{ y: '-115%' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
