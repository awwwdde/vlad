/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'

export function S0Intro() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const [easterOn, setEasterOn] = useState(false)

  const ref1 = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.3 })
  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[60px] text-center"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: easterOn ? 1 : 0 }}
        transition={{ duration: 0.18, ease: 'linear' }}
      >
        <div className="absolute inset-0 easter-blue-glitch" />
      </motion.div>

      <h1
        ref={ref1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(40px, 8vw, 130px)', lineHeight: 0.92 }}
      >
        {t('s0.line1')}
      </h1>

      <div
        className="flex items-baseline gap-[0.2em] mt-2 flex-wrap justify-center"
        style={{ fontSize: 'clamp(40px, 8vw, 130px)', lineHeight: 0.92 }}
      >
        <AnimatedWord text={t('s0.pre')} delay={0.35} color="text-ink/60" />
        <AnimatedClipWord
          text={t('s0.clip')}
          delay={0.45}
          easterOn={easterOn}
          onHoverChange={setEasterOn}
        />
        <AnimatedWord text={t('s0.post')} delay={0.55} color="text-ink/60" />
      </div>
    </motion.section>
  )
}

function AnimatedWord({ text, delay, color }: { text: string; delay: number; color: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { y: '115%', opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay }
    )
  }, [])

  return (
    <span className="overflow-hidden inline-block">
      <span ref={ref} className={`inline-block font-sans font-black ${color}`}>
        {text}
      </span>
    </span>
  )
}

function AnimatedClipWord({
  text,
  delay,
  easterOn,
  onHoverChange,
}: {
  text: string
  delay: number
  easterOn: boolean
  onHoverChange: (active: boolean) => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const clipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!clipRef.current) return
    gsap.fromTo(clipRef.current,
      { clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' },
      { clipPath: 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)', duration: 0.7, ease: SPRING, delay }
    )
    if (ref.current) {
      gsap.fromTo(ref.current,
        { y: '115%', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay: delay + 0.05 }
      )
    }
  }, [])

  return (
    <span
      ref={clipRef}
      className={`inline-block px-[0.18em] overflow-hidden rounded-sm transition-colors duration-150 ${easterOn ? 'bg-[#0B5CFF]' : 'bg-ink'}`}
      style={{ clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' }}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <span ref={ref} className={`inline-block font-sans font-black transition-colors duration-150 ${easterOn ? 'text-white' : 'text-lav'}`}>
        {text}
      </span>
    </span>
  )
}
