/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { TextReveal } from '@/components/ui/TextReveal'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useCursor } from '@/context/CursorContext'
import { usePortfolio, usePortfolioItem, useBundle } from '@/hooks/usePortfolio'

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const { set } = useCursor()

  const items = usePortfolio()
  const item = usePortfolioItem(slug)
  // Все хуки вызываем до любых ранних return-ов (Rules of Hooks).
  const currentIdx = item ? items.findIndex(i => i.slug === item.slug) : -1
  const next = items.length ? items[(currentIdx + 1) % items.length] : null
  const b = useBundle(item)
  const nextBundle = useBundle(next)

  if (!item || !b || !next || !nextBundle) {
    return (
      <div className="pt-40 px-10 text-center">
        <p className="font-mono text-muted">{t('project_detail.not_found')}</p>
        <Link to="/work" className="text-ink underline mt-4 block">
          ← {t('project_detail.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white text-ink">
      <section className="pt-40 pb-16 px-10 md:px-16">
        <Link
          to="/work"
          className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-ink transition-colors block mb-16"
          onMouseEnter={() => set('pointer')}
          onMouseLeave={() => set('default')}
        >
          ← {t('project_detail.all_work')}
        </Link>

        <TextReveal
          as="h1"
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(44px, 8vw, 130px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.1}
        >
          {b.title}
        </TextReveal>

        <TextReveal
          as="p"
          className="font-sans font-black text-lav-dark mt-2"
          style={{ fontSize: 'clamp(20px, 3vw, 48px)' } as any}
          stagger={0.25}
          delay={0.25}
        >
          {b.tagline}
        </TextReveal>
      </section>

      <section className="px-10 md:px-16 mb-20">
        <motion.div
          className="w-full overflow-hidden rounded-2xl bg-lav-bg"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="aspect-video w-full flex items-center justify-center bg-surface">
            <span className="font-mono text-[11px] text-muted uppercase tracking-widest">
              {b.title} - {t('project_detail.preview')}
            </span>
            {item.image_url && <img src={item.image_url} alt={b.title} className="hidden" />}
          </div>
        </motion.div>
      </section>

      <section className="px-10 md:px-16 mb-24">
        <div className="grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <TextReveal
              as="p"
              className="font-sans text-ink/60 leading-relaxed"
              style={{ fontSize: 'clamp(16px, 1.4vw, 22px)' } as any}
              stagger={0.3}
            >
              {b.desc}
            </TextReveal>
          </div>

          <div className="flex flex-col gap-10">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-4">
                {t('project_detail.delivered')}
              </span>
              <div className="flex flex-col gap-2">
                {b.tags.map(tag => (
                  <span key={tag} className="font-sans text-[clamp(14px,1vw,18px)] text-ink">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {item.link && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-4">
                  {t('project_detail.live')}
                </span>
                <MagneticButton href={item.link} variant="outline">
                  {t('project_detail.visit')}
                </MagneticButton>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-10 md:px-16 py-20 border-t border-ink/8">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-8">
          {t('project_detail.next')}
        </span>

        <Link
          to={`/work/${next.slug}`}
          className="group flex items-center justify-between"
          onMouseEnter={() => set('view')}
          onMouseLeave={() => set('default')}
        >
          <motion.h2
            className="font-sans font-black text-ink group-hover:text-lav-dark transition-colors duration-300"
            style={{ fontSize: 'clamp(32px, 6vw, 96px)' }}
            whileHover={{ x: 12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {nextBundle.title}
          </motion.h2>
          <motion.span
            className="font-mono text-[clamp(24px,4vw,64px)] text-ink/20 group-hover:text-lav-dark transition-colors"
            whileHover={{ x: 16 }}
            transition={{ duration: 0.4 }}
          >
            →
          </motion.span>
        </Link>
      </section>
    </div>
  )
}
