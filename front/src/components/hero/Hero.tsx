'use client'

import dynamic from 'next/dynamic'
import { HandwrittenYour } from './HandwrittenYour'
import { RevealOnMount, RevealWords } from './RevealText'
import { HERO_FG, HERO_VEIL } from './tokens'
import { PALETTE } from '../immersive-scene/config'

// Three.js не умеет в SSR, а сама сцена весит заметно больше остальной
// страницы. Грузим её отдельным чанком уже в браузере; до загрузки в кадре
// стоит ровная заливка цветом газона, поэтому подмена не мигает.
const ImmersiveScene = dynamic(
  () => import('../immersive-scene/ImmersiveScene').then(m => m.ImmersiveScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0" style={{ backgroundColor: PALETTE.grass }} />
    ),
  },
)

/**
 * Расписание появления. Порядок задаёт порядок чтения: сначала заголовок,
 * потом подписи по краям, и последним дописывается росчерк - он должен
 * доиграть, когда остальное уже стоит на месте.
 */
const TIMING = {
  headline: 0.25,
  captions: 0.85,
  handwriting: 1.05,
} as const

export function Hero() {
  return (
    <section id="hero" className="relative min-h-[100dvh] w-full overflow-hidden">
      <ImmersiveScene className="absolute inset-0" />

      {/* Ровная тёмная заливка на весь кадр. Плотность одна и та же везде,
          поэтому белый текст читается одинаково и над светлым газоном, и над
          тенью кроны, а сцена под ней остаётся целой. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundColor: `rgba(10, 16, 6, ${HERO_VEIL})` }}
      />

      {/* Текст лежит в HTML поверх канваса, а не внутри сцены: так он
          выделяется, читается скринридером и не зависит от WebGL. */}
      <div
        className="pointer-events-none relative mx-auto flex min-h-[100dvh] w-full max-w-[1920px] flex-col justify-between px-5 pb-8 pt-24 md:px-[100px] md:pb-10 md:pt-28"
        style={{ color: HERO_FG }}
      >
        {/* Заголовок стоит слева по центру - в свободной зоне композиции
            (SAFE_AREA в config сцены), которую персонажи не занимают. */}
        <h1 className="my-auto max-w-[13ch] text-[clamp(38px,6.2vw,88px)] font-semibold leading-[1.02] tracking-[-0.035em]">
          <RevealWords text="I build digital experiences." delay={TIMING.headline} />
        </h1>

        <div className="flex flex-col gap-3 font-ui sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
          <RevealOnMount delay={TIMING.captions}>
            <p className="flex items-baseline gap-[0.35em] whitespace-nowrap text-[14px] font-medium tracking-tight md:text-[15px]">
              <span>create</span>
              {/* Слово нарисовано путями и намеренно шире натурального: росчерк
                  тянется примерно на четыре кегля вместо двух. */}
              <HandwrittenYour
                className="h-[1.5em] w-[4.6em] shrink-0 translate-y-[0.18em]"
                delay={TIMING.handwriting}
              />
              <span>website</span>
            </p>
          </RevealOnMount>

          <RevealOnMount delay={TIMING.captions + 0.08}>
            <p className="text-[14px] font-medium tracking-tight md:text-[15px]">
              Fullstack developer
            </p>
          </RevealOnMount>
        </div>
      </div>
    </section>
  )
}
