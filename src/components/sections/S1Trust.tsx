/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export function S1Trust() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()

  const r1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.18, stagger: 0.25 })
  const r3 = useSplitReveal({ trigger: true, delay: 0.31, stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-start justify-center px-[10vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h1
        ref={r1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(32px, 6vw, 96px)', lineHeight: 1.0 }}
      >
        {t('s1.l1')}
      </h1>
      <h1
        ref={r2 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(32px, 6vw, 96px)', lineHeight: 1.0 }}
      >
        {t('s1.l2')}
      </h1>
      <div
        className="flex items-baseline gap-[0.2em] mt-1 flex-wrap"
        style={{ fontSize: 'clamp(32px, 6vw, 96px)', lineHeight: 1.0 }}
      >
        <h1 ref={r3 as any} className="font-sans font-black text-ink inline">
          {t('s1.l3')}
        </h1>
        <AnimatedClipWord text={t('s1.clip')} delay={0.45} />
      </div>
    </motion.section>
  )
}

function AnimatedClipWord({ text, delay }: { text: string; delay: number }) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    gsap.fromTo(
      wrapRef.current,
      { clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' },
      { clipPath: 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)', duration: 0.7, ease: SPRING, delay },
    )
    if (textRef.current) {
      gsap.fromTo(
        textRef.current,
        { y: '115%', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay: delay + 0.05 },
      )
    }
  }, [delay])

  return (
    <span
      ref={wrapRef}
      className="inline-block bg-lav px-[0.18em] rounded-sm overflow-hidden"
      style={{ clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' }}
    >
      <span ref={textRef} className="inline-block font-sans font-black text-ink">
        {text}
      </span>
    </span>
  )
}
