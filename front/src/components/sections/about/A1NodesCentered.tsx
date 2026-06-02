/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { useCursor } from '@/context/CursorContext'

// 3 ровные карточки: Frontend / Motion / Design.
// Палитра под тёмный фон About: lav на хедерах, белый текст, тонкий контур.
const NODES = [
  { id: 'frontend' as const, accent: '#C4B5FD' },
  { id: 'motion'   as const, accent: '#A8E6D4' },
  { id: 'design'   as const, accent: '#FCA5A5' },
]

const EASE = [0.16, 1, 0.3, 1] as const

export function A1NodesCentered() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const titleRef = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.25, duration: 0.85 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col px-6 md:px-[6vw] pt-[110px] pb-[80px]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2
        ref={titleRef as any}
        className="font-sans font-black text-white whitespace-pre-line max-w-4xl"
        style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}
      >
        {t('about_sections.a1.title')}
      </h2>

      <div className="flex-1 flex items-center mt-8 md:mt-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
          {NODES.map((node, i) => (
            <Card key={node.id} id={node.id} accent={node.accent} index={i} />
          ))}
        </div>
      </div>
    </motion.section>
  )
}

function Card({ id, accent, index }: { id: 'frontend' | 'motion' | 'design'; accent: string; index: number }) {
  const { t } = useTranslation()
  const { set } = useCursor()
  const lines = t(`about_sections.a1.nodes.${id}.lines`, { returnObjects: true }) as string[]
  const title = t(`about_sections.a1.nodes.${id}.title`)

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.45 + index * 0.12 }}
      whileHover={{ y: -8 }}
      onMouseEnter={() => set('view')}
      onMouseLeave={() => set('default')}
      className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 flex flex-col backdrop-blur-sm transition-colors hover:bg-white/[0.06] hover:border-white/25 overflow-hidden"
      style={{ minHeight: 'clamp(260px, 36vh, 380px)' }}
    >
      {/* Цветовая полоса-акцент сверху — край-в-край карточки (inset-x-0),
          при hover просто плотнеет (opacity), не «уезжает» за границы. */}
      <span
        className="absolute top-0 inset-x-0 h-px opacity-60 transition-opacity duration-500 group-hover:opacity-100"
        style={{ backgroundColor: accent }}
        aria-hidden
      />

      {/* Метка */}
      <span
        className="font-mono text-[10px] uppercase tracking-widest"
        style={{ color: accent }}
      >
        0{index + 1} · {t(`about_sections.a1.nodes.${id}.label`)}
      </span>

      {/* Заголовок */}
      <h3
        className="font-sans font-black text-white mt-3"
        style={{ fontSize: 'clamp(24px, 2.8vw, 40px)', lineHeight: 1.0 }}
      >
        {title}
      </h3>

      {/* Список технологий — переехал вниз карточки */}
      <div className="mt-auto pt-6 flex flex-col gap-1">
        {lines.map((line, i) => (
          <span
            key={i}
            className="font-mono text-white/60"
            style={{ fontSize: 'clamp(12px, 1vw, 15px)' }}
          >
            {line}
          </span>
        ))}
      </div>
    </motion.div>
  )
}
