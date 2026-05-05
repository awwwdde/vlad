/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'

const STEPS_KEYS = ['step1', 'step2', 'step3']

export function S3Method() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[8vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2
        ref={rT1 as any}
        className="font-sans font-black text-ink self-start"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s3.title1')}
      </h2>
      <h2
        ref={rT2 as any}
        className="font-sans font-black text-lav-dark self-start mb-[6vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s3.title2')}
      </h2>

      <div className="relative w-full flex justify-around items-center">
        <motion.div
          className="absolute top-1/2 h-px bg-lav-dark left-[80px]"
          initial={{ width: 0 }}
          animate={{ width: 'calc(100% - 160px)' }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
          style={{ transform: 'translateY(-50%)' }}
        />

        {STEPS_KEYS.map((key, i) => (
          <div
            key={key}
            className={`relative z-10 flex flex-col items-center ${i === 1 ? 'flex-col-reverse' : ''}`}
          >
            <motion.p
              className="font-sans text-[clamp(12px,1vw,16px)] text-ink/60 max-w-[200px] text-center leading-relaxed mb-6"
              initial={{ opacity: 0, clipPath: 'polygon(0 0,0 0,0 100%,0 100%)' }}
              animate={{ opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.25 }}
            >
              {t(`s3.${key}_desc`)}
            </motion.p>

            <motion.div
              className="w-9 h-9 rounded-full bg-lav border-[5px] border-white shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.25, type: 'spring', stiffness: 350, damping: 22 }}
            />

            <motion.h3
              className="font-sans font-black text-ink mt-4"
              style={{ fontSize: 'clamp(20px, 2.5vw, 40px)' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 + i * 0.25 }}
            >
              {t(`s3.${key}_title`)}
            </motion.h3>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
