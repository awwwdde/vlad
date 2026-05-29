/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'

export function S4Services() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const cards = t('s4.cards', { returnObjects: true }) as unknown as { title: string; body: string }[]
  const [hovered, setHovered] = useState<number | null>(null)

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  const IDLE_ROTATES = [4, -4, 7, -8]
  const IDLE_Y = ['-4%', '10%', '-6%', '5%']

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[6vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2 ref={rT1 as any} className="font-sans font-black text-ink self-start"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s4.title1')}
      </h2>
      <h2 ref={rT2 as any} className="font-sans font-black text-lav-dark self-start mb-[4vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s4.title2')}
      </h2>

      <div
        className="grid grid-cols-4 gap-4 w-full"
        onMouseLeave={() => setHovered(null)}
      >
        {cards.map((card, i) => {
          const isHovered = hovered === i
          const anyHovered = hovered !== null

          return (
            <motion.div
              key={card.title}
              className="rounded-2xl bg-lav p-6 flex flex-col justify-between text-ink cursor-pointer"
              style={{ aspectRatio: '344/438' }}
              initial={{ y: '100vh', rotate: -10, opacity: 0 }}
              animate={anyHovered
                ? isHovered
                  ? { y: '-4%', rotate: 0, scale: 1.12, opacity: 1, zIndex: 10 }
                  : { y: IDLE_Y[i], rotate: IDLE_ROTATES[i] * 1.5, scale: 0.9, opacity: 0.65 }
                : { y: IDLE_Y[i], rotate: IDLE_ROTATES[i], scale: 1, opacity: 1 }
              }
              transition={{
                duration: anyHovered ? 0.4 : 0.7,
                ease: [0.16, 1, 0.3, 1],
                delay: !anyHovered ? 0.2 + i * 0.15 : 0,
              }}
              onMouseEnter={() => setHovered(i)}
            >
              <h3 className="font-sans font-black text-[clamp(20px,2.2vw,32px)]">
                {card.title}
              </h3>
              <p className="font-sans text-[clamp(11px,0.9vw,15px)] text-ink/70 whitespace-pre-line leading-relaxed">
                {card.body}
              </p>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
