import { SectionProvider, HOME_TOTAL } from '@/context/SectionContext'
import { useSectionScroll } from '@/hooks/useSectionScroll'
import { useSectionCtx } from '@/context/SectionContext'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SectionDots } from '@/components/SectionDots'

import { S0Intro }    from '@/components/sections/S0Intro'
import { S1Trust }    from '@/components/sections/S1Trust'
import { S2About }    from '@/components/sections/S2About'
import { S3Method }   from '@/components/sections/S3Method'
import { S4Services } from '@/components/sections/S4Services'
import { S5Work }     from '@/components/sections/S5Work'
import { S6Contact }  from '@/components/sections/S6Contact'

const SECTION_BG = [
  '#C4B5FD',
  '#ffffff',
  '#EDE9FE',
  '#ffffff',
  '#EDE9FE',
  '#ffffff',
  '#EDE9FE',
]

const HEADER_LIGHT = [false, false, false, false, false, false, false]

function HomeInner() {
  useSectionScroll()
  const { current, dir } = useSectionCtx()

  return (
    <motion.div
      className="fixed inset-0 w-full h-dvh"
      animate={{ backgroundColor: SECTION_BG[current] }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Header lightMode={HEADER_LIGHT[current]} />

      <AnimatePresence mode="wait" custom={dir}>
        {current === 0 && <S0Intro key="s0" />}
        {current === 1 && <S1Trust key="s1" />}
        {current === 2 && <S2About key="s2" />}
        {current === 3 && <S3Method key="s3" />}
        {current === 4 && <S4Services key="s4" />}
        {current === 5 && <S5Work key="s5" />}
        {current === 6 && <S6Contact key="s6" />}
      </AnimatePresence>

      <SectionDots />
      <Footer />
    </motion.div>
  )
}

export default function Home() {
  return (
    <SectionProvider total={HOME_TOTAL}>
      <HomeInner />
    </SectionProvider>
  )
}
