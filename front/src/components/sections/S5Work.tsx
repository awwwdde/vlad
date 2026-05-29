/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import { useCursor } from '@/context/CursorContext'
import { usePortfolio, useBundle } from '@/hooks/usePortfolio'
import type { PortfolioItem } from '@/admin/types'

const CARD_ROTATE = -12

export function S5Work() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [hovered, setHovered] = useState<number | null>(null)
  const items = usePortfolio()

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2, stagger: 0.25 })

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
        {t('s5.title1')}
      </h2>
      <h2 ref={rT2 as any} className="font-sans font-black text-lav-dark self-start mb-[3vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s5.title2')}
      </h2>

      <div
        className="relative w-full overflow-hidden"
        style={{ height: '48vh' }}
        onMouseLeave={() => setHovered(null)}
      >
        <div className="relative h-full flex items-center">
          {items.map((item, i) => (
            <Card
              key={item.slug}
              item={item}
              index={i}
              hovered={hovered}
              onHover={setHovered}
            />
          ))}

          <motion.div
            className="relative rounded-2xl bg-lav flex items-center justify-center -ml-[12%]"
            style={{
              width: '32%',
              height: '100%',
              zIndex: hovered === items.length ? 10 : 0,
            }}
            animate={
              hovered === items.length
                ? { rotate: 0, scale: 1.1, y: '-5%' }
                : { rotate: CARD_ROTATE, scale: 0.72 }
            }
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => { setHovered(items.length); set('pointer') }}
            onMouseLeave={() => set('default')}
          >
            <Link
              to="/work"
              className="font-sans font-black text-ink text-center"
              style={{ fontSize: 'clamp(16px, 2vw, 30px)' }}
            >
              {t('s5.cta')}
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  )
}

function Card(props: {
  item: PortfolioItem
  index: number
  hovered: number | null
  onHover: (i: number | null) => void
}) {
  const { item, index: i, hovered, onHover } = props
  const { set } = useCursor()
  const b = useBundle(item)!

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden bg-surface -ml-[12%] first:ml-0"
      style={{
        width: '32%',
        height: '100%',
        zIndex: hovered === i ? 10 : i,
      }}
      animate={
        hovered === null
          ? { rotate: CARD_ROTATE, scale: 0.72, y: 0 }
          : hovered === i
            ? { rotate: 0, scale: 1, y: '-5%' }
            : { rotate: CARD_ROTATE, scale: 0.62, y: '3%' }
      }
      transition={{
        duration: hovered !== null ? 0.4 : 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: hovered === null ? i * 0.08 : 0,
      }}
      onMouseEnter={() => { onHover(i); set('view') }}
      onMouseLeave={() => set('default')}
    >
      <Link to={`/work/${item.slug}`} className="block w-full h-full relative">
        <div className="w-full h-full bg-lav-bg flex items-center justify-center">
          <span className="font-mono text-[11px] text-ink/40 uppercase tracking-widest">
            {b.title}
          </span>
        </div>

        <motion.div
          className="absolute inset-0 bg-lav flex flex-col items-center justify-center gap-4 p-6"
          animate={{ opacity: hovered === i ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        >
          <p className="font-sans font-bold text-ink text-center text-[clamp(14px,1.2vw,20px)]">
            {b.title}
          </p>
          <div className="flex flex-wrap gap-1 justify-center">
            {b.tags.map(tag => (
              <span
                key={tag}
                className="font-mono text-[10px] text-ink/60 uppercase tracking-widest"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </Link>
    </motion.div>
  )
}
