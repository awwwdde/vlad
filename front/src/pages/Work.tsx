/* eslint-disable @typescript-eslint/no-explicit-any */
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TextReveal } from '@/components/ui/TextReveal'
import { useCursor } from '@/context/CursorContext'
import { usePortfolio, useBundle } from '@/hooks/usePortfolio'
import type { PortfolioItem } from '@/admin/types'

export default function Work() {
  const { t } = useTranslation()
  const items = usePortfolio()

  return (
    <div className="bg-white text-ink min-h-screen">
      <section className="pt-40 pb-24 px-10 md:px-16">
        <TextReveal
          as="span"
          className="font-mono text-[11px] uppercase tracking-widest text-muted block mb-10"
          stagger={0.2}
          delay={0.1}
        >
          {t('work_page.label')}
        </TextReveal>

        <TextReveal
          as="h1"
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 140px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.2}
        >
          {t('work_page.line1')}
        </TextReveal>
        <TextReveal
          as="h1"
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 140px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.35}
        >
          {t('work_page.line2')}
        </TextReveal>
        <TextReveal
          as="h1"
          className="font-sans font-black text-ink/15 leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 140px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.5}
        >
          {t('work_page.line3')}
        </TextReveal>
      </section>

      <section className="px-10 md:px-16 pb-32">
        <div className="divide-y divide-ink/8">
          {items.map((item, i) => (
            <ProjectRow key={item.slug} item={item} index={i} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ProjectRow({ item, index }: { item: PortfolioItem; index: number }) {
  const { set } = useCursor()
  const b = useBundle(item)!

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
    >
      <Link
        to={`/work/${item.slug}`}
        className="group flex items-center justify-between py-8 md:py-10 gap-6 relative overflow-hidden"
        onMouseEnter={() => set('view')}
        onMouseLeave={() => set('default')}
      >
        <motion.div
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: item.accent ?? '#C4B5FD', originX: 0 }}
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />

        <span className="font-mono text-[11px] text-muted w-8 flex-shrink-0 group-hover:text-ink transition-colors">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="flex-grow min-w-0">
          <motion.h2
            className="font-sans font-black text-ink leading-tight group-hover:text-white transition-colors duration-300"
            style={{ fontSize: 'clamp(24px, 3.5vw, 56px)' }}
            whileHover={{ x: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {b.title}
          </motion.h2>
          <p className="font-mono text-[11px] text-muted uppercase tracking-widest mt-1 group-hover:text-white/60 transition-colors">
            {b.tagline}
          </p>
        </div>

        <div className="hidden md:flex gap-2 flex-wrap justify-end max-w-[280px] flex-shrink-0">
          {b.tags.map(tag => (
            <span
              key={tag}
              className="font-mono text-[10px] text-muted border border-ink/10 px-3 py-1 rounded-full group-hover:border-white/20 group-hover:text-white/60 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        <motion.span
          className="font-mono text-[18px] text-ink/20 group-hover:text-white flex-shrink-0 transition-colors"
          whileHover={{ x: 6 }}
          transition={{ duration: 0.3 }}
        >
          →
        </motion.span>
      </Link>
    </motion.div>
  )
}
