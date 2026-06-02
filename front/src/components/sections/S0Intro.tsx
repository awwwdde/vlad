import { useRef, useLayoutEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import { useColorDoubtGlitch, type GlitchPalette } from '@/hooks/useColorDoubtGlitch'
import { useCursor } from '@/context/CursorContext'

const PALETTE_A = {
  bg:       '#C4B5FD',
  text:     '#2D1B69',
  clipBg:   '#2D1B69',
  clipText: '#C4B5FD',
}
const PALETTE_B = {
  bg:       '#A8E6D4',
  text:     '#0F4C3A',
  clipBg:   '#0F4C3A',
  clipText: '#A8E6D4',
}

const GLITCH_A: GlitchPalette = { bg: PALETTE_A.bg, text: PALETTE_A.text, clipBg: PALETTE_A.clipBg }
const GLITCH_B: GlitchPalette = { bg: PALETTE_B.bg, text: PALETTE_B.text, clipBg: PALETTE_B.clipBg }

const HEADLINE_SIZE = 'clamp(28px, 5vw, 80px)'
const HEADLINE_LINE_HEIGHT = 1.05

/** Открытый clip-path в разметке — если GSAP не выполнится, слово не «исчезает» */
const CLIP_OPEN = 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)'
const CLIP_CLOSED = 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)'

/** Зазор между плашкой и строками сверху/снизу.
 *  Использует одни и те же значения для label и question, поэтому композиция
 *  визуально симметрична относительно центра.
 *  0.4em — плотный «пакет», как один логический заголовок. */
const ROW_GAP = '0.4em'

export function S0Intro() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()

  const sectionRef  = useRef<HTMLElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const triggerRef  = useRef<HTMLSpanElement>(null)
  const clipWrapRef = useRef<HTMLSpanElement>(null)
  const clipTextRef = useRef<HTMLSpanElement>(null)

  const [isStateB, setIsStateB] = useState(false)
  const palette = isStateB ? PALETTE_B : PALETTE_A

  const labelText    = t(isStateB ? 's0.labelAlt' : 's0.label')
  const questionText = t(isStateB ? 's0.questionAlt' : 's0.question')
  const clipWord     = isStateB ? t('s0.wordAlt') : t('s0.word')

  const handleReachB = useCallback(() => setIsStateB(true), [])
  const handleReachA = useCallback(() => setIsStateB(false), [])

  const { startHold, stopHold } = useColorDoubtGlitch({
    sectionRef,
    canvasRef,
    triggerRef,
    paletteA:  GLITCH_A,
    paletteB:  GLITCH_B,
    onReachA:  handleReachA,
    onReachB:  handleReachB,
    blockSize: 14,
  })

  const r0 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.3, duration: 0.9 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.15, stagger: 0.3, duration: 0.9 })

  /** Вход: до первого paint задаём закрытое состояние и сразу анимируем (иначе clip + GSAP дают «пустую» плашку) */
  useLayoutEffect(() => {
    const wrap = clipWrapRef.current
    const text = clipTextRef.current
    if (!wrap || !text) return
    gsap.set(wrap, { clipPath: CLIP_CLOSED })
    gsap.set(text, { y: '115%', opacity: 0 })
    gsap.to(wrap, {
      clipPath: CLIP_OPEN,
      duration: 0.75,
      ease: SPRING,
      delay: 0.4,
    })
    gsap.to(text, {
      y: 0,
      opacity: 1,
      duration: 0.85,
      ease: SPRING,
      delay: 0.45,
    })
  }, [])

  const headlineStyle = {
    fontSize: HEADLINE_SIZE,
    lineHeight: HEADLINE_LINE_HEIGHT,
  } as const

  const colorTransition = 'color 1.2s cubic-bezier(0.4, 0, 0.2, 1)'

  // Базовые стили для строк, которые расположены absolute относительно
  // плашки — а сама плашка ВСЕГДА в геометрическом центре секции. Так
  // обеспечивается отсутствие layout shift между state A и state B.
  const sideLine = {
    className: 'font-sans font-black leading-none m-0 absolute left-1/2 -translate-x-1/2 whitespace-nowrap',
    style: { ...headlineStyle, color: palette.text, transition: colorTransition },
  } as const

  return (
    <motion.section
      ref={sectionRef}
      className="fixed inset-0 flex items-center justify-center px-[60px] text-center"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
      style={{
        backgroundColor: palette.bg,
        transition: 'background-color 1.75s cubic-bezier(0.4, 0, 0.2, 1)',
        isolation: 'isolate',
      }}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ zIndex: 1 }}
      />

      {/* Композиция вокруг геометрического центра.
          - Плашка с плашкой — это inline-flex по центру; она задаёт центр.
          - Label выезжает вверх через absolute (bottom: 100% + gap).
          - Question — вниз (top: 100% + gap).
          Высота плашки = базовая высота line-height, поэтому центр плашки
          совпадает с центром секции; смена текста вокруг не двигает её. */}
      <div
        className="relative z-10 flex items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        {/* Label — выше плашки */}
        <h2
          ref={r0 as any}
          {...sideLine}
          style={{
            ...sideLine.style,
            bottom: `calc(100% + ${ROW_GAP})`,
          }}
        >
          {labelText}
        </h2>

        {/* Центральная строка: «Это» + плашка со словом */}
        <div
          className="flex flex-wrap items-center justify-center gap-[0.25em]"
          style={headlineStyle}
        >
          <h2
            className="font-sans font-black m-0 inline leading-none"
            style={{ color: palette.text, transition: colorTransition }}
          >
            {t('s0.pre')}
          </h2>

          <span
            ref={triggerRef}
            className="inline-flex cursor-pointer items-center self-center"
            style={{ pointerEvents: 'all' as const }}
            onMouseEnter={() => { startHold(); set('pointer') }}
            onMouseLeave={() => { stopHold(); set('default') }}
            onTouchStart={(e) => { e.preventDefault(); startHold() }}
            onTouchEnd={() => stopHold()}
          >
            <span
              ref={clipWrapRef}
              className="inline-flex overflow-hidden rounded-sm"
              style={{
                backgroundColor: palette.clipBg,
                clipPath: CLIP_OPEN,
                transition: 'background-color 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <span
                ref={clipTextRef}
                className="inline-block min-w-[8ch] px-[0.18em] font-sans font-black"
                style={{
                  fontSize: HEADLINE_SIZE,
                  lineHeight: HEADLINE_LINE_HEIGHT,
                  color: palette.clipText,
                  transition: colorTransition,
                }}
              >
                {clipWord}
              </span>
            </span>
          </span>
        </div>

        {/* Question — ниже плашки */}
        <h2
          {...sideLine}
          style={{
            ...sideLine.style,
            top: `calc(100% + ${ROW_GAP})`,
          }}
        >
          <span ref={r2 as any} className="inline-block">
            {questionText}
          </span>
        </h2>
      </div>
    </motion.section>
  )
}
