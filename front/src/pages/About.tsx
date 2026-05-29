import { SectionProvider, ABOUT_TOTAL } from '@/context/SectionContext'
import { useSectionScroll } from '@/hooks/useSectionScroll'
import { useSectionCtx } from '@/context/SectionContext'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SectionDots } from '@/components/SectionDots'
import { A0Story } from '@/components/sections/about/A0Story'
import { A1NodesCentered } from '@/components/sections/about/A1NodesCentered'
import { A2Contact } from '@/components/sections/about/A2Contact'

const ABOUT_BG = [
  '#ffffff',
  '#0D0D0D',
  '#EDE9FE',
]

const HEADER_LIGHT = [false, true, false]

function AboutInner() {
  useSectionScroll()
  const { current, dir } = useSectionCtx()

  return (
    <motion.div
      className="fixed inset-0 w-full h-dvh"
      animate={{ backgroundColor: ABOUT_BG[current] }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Header lightMode={HEADER_LIGHT[current]} />

      <AnimatePresence mode="wait" custom={dir}>
        {current === 0 && <A0Story key="a0" />}
        {current === 1 && <A1NodesCentered key="a1" />}
        {current === 2 && <A2Contact key="a2" />}
      </AnimatePresence>

      <SectionDots />
      <Footer light={HEADER_LIGHT[current]} />
    </motion.div>
  )
}

export default function About() {
  return (
    <SectionProvider total={ABOUT_TOTAL}>
      <AboutInner />
    </SectionProvider>
  )
}
