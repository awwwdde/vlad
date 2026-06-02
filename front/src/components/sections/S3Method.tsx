/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'

// Шаги процесса. Каждый — пара заголовок+описание + большая цифра-«фон»,
// согласовано с приёмом из /work (где номера проектов в text-ink/15).
const STEPS = [
  { key: 'step1', num: '01' },
  { key: 'step2', num: '02' },
  { key: 'step3', num: '03' },
] as const

const EASE = [0.16, 1, 0.3, 1] as const

// Единая «волна» прихода всех элементов секции. Заголовки используют
// split-reveal (по чарам), карточки — простой y/opacity. Чтобы это не
// выглядело как «сначала текст, потом отстают карточки», синхронизируем
// все по ENTRY_DELAY.
const ENTRY_DELAY = 0.35

export function S3Method() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()

  const rT1 = useSplitReveal({ trigger: true, delay: ENTRY_DELAY,        stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: ENTRY_DELAY + 0.12, stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col justify-center px-6 md:px-[8vw] py-[110px]"
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
        {t('s3.title1')}
      </h2>
      <h2
        ref={rT2 as any}
        className="font-sans font-black text-lav-dark mb-[6vh] md:mb-[8vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s3.title2')}
      </h2>

      {/* Сетка шагов: на mobile один столбец, на md+ — три. Каждый шаг — big
          number сверху, заголовок, описание; разделитель снизу через border. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10 md:gap-x-12">
        {STEPS.map(({ key, num }, i) => (
          <motion.div
            key={key}
            className="relative pt-6 border-t border-ink/15"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: EASE, delay: ENTRY_DELAY + 0.18 + i * 0.1 }}
          >
            {/* Big-number — приглушённый, играет роль маркера */}
            <span
              className="font-sans font-black text-ink/15 leading-none block"
              style={{ fontSize: 'clamp(54px, 7vw, 120px)' }}
            >
              {num}
            </span>

            <h3
              className="font-sans font-black text-ink mt-4"
              style={{ fontSize: 'clamp(22px, 2.4vw, 36px)', lineHeight: 1.05 }}
            >
              {t(`s3.${key}_title`)}
            </h3>

            <p
              className="font-sans text-ink/60 mt-3 leading-relaxed"
              style={{ fontSize: 'clamp(14px, 1.05vw, 17px)', maxWidth: '32ch' }}
            >
              {t(`s3.${key}_desc`)}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
