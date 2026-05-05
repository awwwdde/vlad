/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { TextReveal } from '@/components/ui/TextReveal'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useCursor } from '@/context/CursorContext'

const SLUGS = ['pickupservice', 'kitluna', 'linkavto', 'awwwdde', 'abrikosova']

const PROJECT_LINKS: Record<string, string> = {
  pickupservice: 'https://pickupservice.moscow/',
  linkavto: 'https://linkavto.ru/',
  abrikosova: 'https://www.abrikosova-elena.ru/',
}

const PROJECT_IMAGES: Record<string, string> = {
  pickupservice: '/images/pickupservice.jpg',
  kitluna: '/images/kitluna.jpg',
  linkavto: '/images/linkavto.jpg',
  awwwdde: '/images/awwwdde.jpg',
  abrikosova: '/images/abrikosova.jpg',
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const { set } = useCursor()

  if (!slug || !SLUGS.includes(slug)) {
    return (
      <div className="pt-40 px-10 text-center">
        <p className="font-mono text-muted">{t('project_detail.not_found')}</p>
        <Link to="/work" className="text-ink underline mt-4 block">← {t('project_detail.back')}</Link>
      </div>
    )
  }

  const title = t(`projects.${slug}.title`)
  const tagline = t(`projects.${slug}.tagline`)
  const desc = t(`projects.${slug}.desc`)
  const tags = t(`projects.${slug}.tags`, { returnObjects: true }) as string[]
  const link = PROJECT_LINKS[slug]
  const imgSrc = PROJECT_IMAGES[slug]

  const nextSlug = SLUGS[(SLUGS.indexOf(slug) + 1) % SLUGS.length]

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
          {title}
        </TextReveal>

        <TextReveal
          as="p"
          className="font-sans font-black text-lav-dark mt-2"
          style={{ fontSize: 'clamp(20px, 3vw, 48px)' } as any}
          stagger={0.25}
          delay={0.25}
        >
          {tagline}
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
              {title} - {t('project_detail.preview')}
            </span>
            <img src={imgSrc} alt={title} className="hidden" />
            {/* <img src={imgSrc} alt={title} className="w-full h-full object-cover" /> */}
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
              {desc}
            </TextReveal>
          </div>

          <div className="flex flex-col gap-10">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-4">
                {t('project_detail.delivered')}
              </span>
              <div className="flex flex-col gap-2">
                {tags.map(tag => (
                  <span key={tag} className="font-sans text-[clamp(14px,1vw,18px)] text-ink">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {link && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-4">
                  {t('project_detail.live')}
                </span>
                <MagneticButton
                  href={link}
                  variant="outline"
                >
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
          to={`/work/${nextSlug}`}
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
            {t(`projects.${nextSlug}.title`)}
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
