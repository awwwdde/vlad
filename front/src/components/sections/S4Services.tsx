/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import { useCursor } from '@/context/CursorContext'

const EASE = [0.16, 1, 0.3, 1] as const

// Базовые наклоны идл-стейта — карточки стоят «небрежно», как разложенные
// постеры. Чередуем знак и величину, чтобы выглядело органично.
const IDLE_ROTATE = [-6, 4, -3, 7]
const IDLE_Y      = ['2%', '-3%', '4%', '-2%']

const ENTRY_DELAY = 0.35

export function S4Services() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const cards = t('s4.cards', { returnObjects: true }) as unknown as { title: string; body: string }[]
  const [hovered, setHovered] = useState<number | null>(null)

  const rT1 = useSplitReveal({ trigger: true, delay: ENTRY_DELAY,        stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: ENTRY_DELAY + 0.12, stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col justify-center px-6 md:px-[6vw] py-[110px]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2
        ref={rT1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s4.title1')}
      </h2>
      <h2
        ref={rT2 as any}
        className="font-sans font-black text-lav-dark mb-[4vh] md:mb-[6vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s4.title2')}
      </h2>

      {/* Контейнер с perspective + большой паддинг по периметру:
          rotate/scale при hover не вылезают за пределы родителя и не
          обрезаются. На mobile наклоны отключаются — слишком тесно. */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 py-8 md:py-12"
        style={{ perspective: '1000px' }}
        onMouseLeave={() => setHovered(null)}
      >
        {cards.map((card, i) => {
          const isHovered  = hovered === i
          const anyHovered = hovered !== null && !isHovered

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 60, rotate: IDLE_ROTATE[i] }}
              animate={{
                opacity: anyHovered ? 0.5 : 1,
                y: isHovered ? '-6%' : IDLE_Y[i],
                rotate: isHovered ? 0 : (anyHovered ? IDLE_ROTATE[i] * 1.6 : IDLE_ROTATE[i]),
                scale: isHovered ? 1.06 : (anyHovered ? 0.94 : 1),
                zIndex: isHovered ? 10 : 1,
              }}
              transition={{
                duration: hovered === null ? 0.7 : 0.4,
                ease: EASE,
                delay: hovered === null ? ENTRY_DELAY + 0.18 + i * 0.1 : 0,
              }}
              onMouseEnter={() => { setHovered(i); set('view') }}
              onMouseLeave={() => set('default')}
              // origin-bottom — карточки «врастают» в землю, не падают вбок.
              // sm:rotate-0 на mobile — там грид одноколоночный, наклон не нужен.
              className="rounded-2xl bg-lav text-ink p-6 md:p-7 flex flex-col justify-between cursor-pointer"
              style={{
                aspectRatio: '344/438',
                transformOrigin: 'center bottom',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
              }}
            >
              <h3
                className="font-sans font-black"
                style={{ fontSize: 'clamp(20px, 2.2vw, 32px)', lineHeight: 1.0 }}
              >
                {card.title}
              </h3>
              <p
                className="font-sans text-ink/70 whitespace-pre-line leading-relaxed"
                style={{ fontSize: 'clamp(12px, 0.95vw, 15px)' }}
              >
                {card.body}
              </p>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
