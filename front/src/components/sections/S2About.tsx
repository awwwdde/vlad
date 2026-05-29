/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { WordRotator } from '@/components/ui/WordRotator'
import { sectionVariants } from './sectionVariants'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'

export function S2About() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const words = t('s2.rotating', { returnObjects: true }) as unknown as string[]

  const r1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.3 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.25, stagger: 0.25 })
  const r3 = useSplitReveal({ trigger: true, delay: 0.4, stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[60px] text-center"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2
        ref={r1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}
      >
        {t('s2.l1')}
      </h2>

      <div
        className="flex items-baseline justify-center gap-[0.25em] flex-wrap"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}
      >
        <h2 ref={r2 as any} className="font-sans font-black text-ink inline">
          {t('s2.l2')}
        </h2>
        <AnimatedClipWrap delay={0.55}>
          <WordRotator words={words} />
        </AnimatedClipWrap>
        <h2 ref={r3 as any} className="font-sans font-black text-ink inline">
          {t('s2.l3')}
        </h2>
      </div>

      <p className="font-mono text-[11px] uppercase tracking-widest text-ink/40 mt-12">
        awwwdde — Creative Developer & Designer
      </p>
    </motion.section>
  )
}

function AnimatedClipWrap({ children, delay }: { children: ReactNode; delay: number }) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!wrapRef.current) return
    gsap.fromTo(
      wrapRef.current,
      { clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' },
      { clipPath: 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)', duration: 0.7, ease: SPRING, delay },
    )
  }, [delay])

  return (
    <div
      ref={wrapRef}
      className="inline-block overflow-hidden rounded-sm"
      style={{ clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' }}
    >
      {children}
    </div>
  )
}
