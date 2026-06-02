/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import { useCursor } from '@/context/CursorContext'
import { usePortfolio, useBundle } from '@/hooks/usePortfolio'
import type { PortfolioItem } from '@/admin/types'

const EASE = [0.16, 1, 0.3, 1] as const

const ENTRY_DELAY = 0.35

export function S5Work() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const items = usePortfolio()

  const rT1 = useSplitReveal({ trigger: true, delay: ENTRY_DELAY,        stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: ENTRY_DELAY + 0.12, stagger: 0.25 })

  // Лид (большой) + 2 поменьше. Если проектов меньше — гасим грид по факту.
  const featured  = items[0]
  const secondary = items.slice(1, 3)

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
        {t('s5.title1')}
      </h2>
      <h2
        ref={rT2 as any}
        className="font-sans font-black text-lav-dark mb-[4vh] md:mb-[5vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s5.title2')}
      </h2>

      {/* Layout-сетка:
          - lg: 3 колонки × 2 строки. Featured занимает 2×2, справа stack из
            2 secondary + CTA в нижней клетке (CTA col-start-3 row-start-2).
          - md: featured во всю ширину сверху, ниже три равных карточки.
          - mobile: всё столбиком. */}
      <div
        className="grid gap-3 md:gap-4
          grid-cols-1
          md:grid-cols-3 md:grid-rows-[auto_auto]
          lg:grid-cols-3 lg:grid-rows-2"
      >
        {featured && (
          <Featured
            item={featured}
            delay={ENTRY_DELAY + 0.18}
            // На md featured растягивается на всю верхнюю строку.
            // На lg — на 2 колонки × 2 строки (большой блок слева).
            className="md:col-span-3 lg:col-span-2 lg:row-span-2"
          />
        )}

        {secondary.map((item, i) => (
          <Secondary key={item.slug} item={item} delay={ENTRY_DELAY + 0.28 + i * 0.08} />
        ))}

        <Cta delay={ENTRY_DELAY + 0.44} />
      </div>
    </motion.section>
  )
}

// ── Featured (лид) ──────────────────────────────────────────────────────────

function Featured({ item, className = '', delay }: { item: PortfolioItem; className?: string; delay: number }) {
  const { set } = useCursor()
  const b = useBundle(item)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.85, ease: EASE, delay }}
      whileHover={{ y: -6 }}
      onMouseEnter={() => set('view')}
      onMouseLeave={() => set('default')}
      className={`group relative rounded-2xl overflow-hidden cursor-pointer ${className}`}
      style={{
        backgroundColor: item.accent ?? '#C4B5FD',
        minHeight: 'clamp(280px, 42vh, 540px)',
      }}
    >
      <Link to={`/work/${item.slug}`} className="block w-full h-full relative">
        {/* Метка «Featured» */}
        <span className="absolute top-5 left-5 md:top-6 md:left-6 font-mono text-[10px] uppercase tracking-widest text-ink/40">
          featured
        </span>

        {/* Заголовок + tagline по нижнему краю */}
        <div className="absolute bottom-0 inset-x-0 p-5 md:p-8 lg:p-10 flex flex-col gap-2">
          <h3
            className="font-sans font-black text-ink leading-none"
            style={{ fontSize: 'clamp(28px, 5vw, 84px)' }}
          >
            {b.title}
          </h3>
          <p
            className="font-sans text-ink/70 leading-snug max-w-[40ch]"
            style={{ fontSize: 'clamp(13px, 1.2vw, 18px)' }}
          >
            {b.tagline}
          </p>

          {/* Теги — компактной строкой */}
          {b.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {b.tags.slice(0, 4).map(tag => (
                <span
                  key={tag}
                  className="font-mono text-[10px] text-ink/55 uppercase tracking-widest border border-ink/15 px-2 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hover-эффект: тонкий «glow» по правому верхнему углу — стрелка */}
        <span
          className="absolute top-5 right-5 md:top-6 md:right-6 font-mono text-[18px] text-ink/35 transition-all duration-500 group-hover:text-ink group-hover:translate-x-1 group-hover:-translate-y-1"
          aria-hidden
        >
          ↗
        </span>
      </Link>
    </motion.div>
  )
}

// ── Secondary (две карточки поменьше) ───────────────────────────────────────

function Secondary({ item, delay }: { item: PortfolioItem; delay: number }) {
  const { set } = useCursor()
  const b = useBundle(item)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => set('view')}
      onMouseLeave={() => set('default')}
      className="group relative rounded-2xl overflow-hidden cursor-pointer aspect-[4/3] md:aspect-auto"
      style={{
        backgroundColor: item.accent ?? '#EDE9FE',
        minHeight: 'clamp(180px, 20vh, 240px)',
      }}
    >
      <Link to={`/work/${item.slug}`} className="block w-full h-full relative p-4 md:p-5">
        <div className="absolute bottom-0 inset-x-0 p-4 md:p-5">
          <h4
            className="font-sans font-black text-ink leading-tight"
            style={{ fontSize: 'clamp(16px, 1.8vw, 26px)' }}
          >
            {b.title}
          </h4>
          <p
            className="font-mono text-[10px] text-ink/55 uppercase tracking-widest mt-1.5 line-clamp-1"
          >
            {b.tagline}
          </p>
        </div>

        <span
          className="absolute top-4 right-4 md:top-5 md:right-5 font-mono text-[14px] text-ink/30 transition-all duration-500 group-hover:text-ink group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        >
          →
        </span>
      </Link>
    </motion.div>
  )
}

// ── CTA «Все работы» ───────────────────────────────────────────────────────

function Cta({ delay }: { delay: number }) {
  const { t } = useTranslation()
  const { set } = useCursor()

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => set('pointer')}
      onMouseLeave={() => set('default')}
      className="group relative rounded-2xl overflow-hidden cursor-pointer bg-ink text-white flex items-center justify-between p-5 md:p-6 aspect-[4/3] md:aspect-auto"
      style={{
        minHeight: 'clamp(140px, 16vh, 200px)',
      }}
    >
      <Link to="/work" className="block w-full h-full relative">
        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            all work
          </span>
          <div className="flex items-end justify-between gap-3">
            <h4
              className="font-sans font-black text-white leading-none"
              style={{ fontSize: 'clamp(20px, 2.2vw, 32px)' }}
            >
              {t('s5.cta')}
            </h4>
            <span
              className="font-mono text-[24px] text-white/50 transition-all duration-500 group-hover:text-white group-hover:translate-x-1"
              aria-hidden
            >
              →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
