/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function A0Story() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const facts = t('about_sections.a0.facts', { returnObjects: true }) as Array<{ num: string; label: string }>

  const r1 = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.28, duration: 0.9 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.25, stagger: 0.28, duration: 0.9 })
  const r3 = useSplitReveal({ trigger: true, delay: 0.4, stagger: 0.28, duration: 0.9 })

  const paraRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!paraRef.current) return
    gsap.fromTo(paraRef.current,
      { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', opacity: 0 },
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        opacity: 1,
        duration: 0.9,
        ease: SPRING,
        delay: 0.7,
      }
    )
  }, [])

  const factsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!factsRef.current) return
    const items = factsRef.current.querySelectorAll('.fact-item')
    gsap.fromTo(items,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: SPRING, stagger: 0.12, delay: 0.9 }
    )
  }, [])

  return (
    <motion.section
      className="fixed inset-0 flex flex-col justify-center px-10 md:px-16"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted block mb-10">
        {t('about_sections.a0.badge')}
      </span>

      <div>
        <h1
          ref={r1 as any}
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(44px, 7.5vw, 120px)' }}
        >
          {t('about_sections.a0.line1')}
        </h1>

        <div
          className="flex items-baseline gap-[0.2em] flex-wrap"
          style={{ fontSize: 'clamp(44px, 7.5vw, 120px)' }}
        >
          <h1
            ref={r2 as any}
            className="font-sans font-black text-ink leading-[0.92] tracking-tight inline"
          >
            {t('about_sections.a0.line2')}
          </h1>
          <ClipBlock
            text={t('about_sections.a0.clip')}
            delay={0.4}
          />
        </div>

        <h1
          ref={r3 as any}
          className="font-sans font-black text-ink/20 leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(44px, 7.5vw, 120px)' }}
        >
          {t('about_sections.a0.line3')}
        </h1>
      </div>

      <p
        ref={paraRef}
        className="font-sans text-[clamp(15px,1.3vw,20px)] text-ink/50 leading-relaxed max-w-lg mt-10"
        style={{ clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
      >
        {t('about_sections.a0.paragraph')}
      </p>

      <div ref={factsRef} className="flex gap-8 mt-12">
        {facts.map((fact) => (
          <div key={fact.num} className="fact-item">
            <span
              className="font-sans font-black text-lav block"
              style={{ fontSize: 'clamp(28px, 3.5vw, 56px)', lineHeight: 1 }}
            >
              {fact.num}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted whitespace-pre-line block mt-1">
              {fact.label}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

function ClipBlock({ text, delay }: { text: string; delay: number }) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!wrapRef.current || !textRef.current) return

    gsap.fromTo(wrapRef.current,
      { clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' },
      {
        clipPath: 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)',
        duration: 0.75,
        ease: SPRING,
        delay,
      }
    )
    gsap.fromTo(textRef.current,
      { y: '115%', opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay: delay + 0.05 }
    )
  }, [delay])

  return (
    <span
      ref={wrapRef}
      className="inline-block bg-lav px-[0.18em] overflow-hidden rounded-sm"
      style={{ clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' }}
    >
      <span
        ref={textRef}
        className="inline-block font-sans font-black text-ink leading-[0.92]"
        style={{ display: 'inline-block', transform: 'translateY(115%)' }}
      >
        {text}
      </span>
    </span>
  )
}
