/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { useCursor } from '@/context/CursorContext'
import gsap from 'gsap'

type Point = { x: number; y: number }
type NodeData = {
  id: 'frontend' | 'motion' | 'design'
  bg: string
  textColor: string
  desktop: Point
  mobile: Point
  size: { desktop: string; mobile: string }
  floatDuration: number
  floatDelta: number
  delay: number
  labelDown: boolean
}

const NODES: NodeData[] = [
  { id: 'frontend', bg: '#ffffff', textColor: '#0D0D0D', desktop: { x: 34, y: 63 }, mobile: { x: 24, y: 64 }, size: { desktop: 'clamp(190px, 19vw, 300px)', mobile: 'clamp(140px, 42vw, 210px)' }, floatDuration: 4.6, floatDelta: 14, delay: 0, labelDown: false },
  { id: 'motion', bg: '#111827', textColor: '#ffffff', desktop: { x: 50, y: 52 }, mobile: { x: 50, y: 49 }, size: { desktop: 'clamp(190px, 19vw, 300px)', mobile: 'clamp(140px, 42vw, 210px)' }, floatDuration: 5.2, floatDelta: 16, delay: 0.2, labelDown: false },
  { id: 'design', bg: '#C4B5FD', textColor: '#0D0D0D', desktop: { x: 66, y: 63 }, mobile: { x: 76, y: 64 }, size: { desktop: 'clamp(190px, 19vw, 300px)', mobile: 'clamp(140px, 42vw, 210px)' }, floatDuration: 4.9, floatDelta: 12, delay: 0.4, labelDown: true },
]

export function A1NodesCentered() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState<boolean>(() => window.innerWidth <= 768)
  const titleRef = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.25, duration: 0.85 })

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <motion.section className="fixed inset-0 flex flex-col pt-[110px] px-4 md:px-10 overflow-hidden" variants={sectionVariants} initial="initial" animate="animate" exit="exit" custom={dir}>
      <h2 ref={titleRef as any} className="font-sans font-black text-white relative z-10 whitespace-pre-line" style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}>
        {t('about_sections.a1.title')}
      </h2>
      <div className="relative flex-1 mt-2 md:mt-4">
        {NODES.map((node, i) => (
          <FloatingNode key={node.id} node={node} index={i} isMobile={isMobile} isActive={activeNode === node.id} onEnter={() => { setActiveNode(node.id); set('view') }} onLeave={() => { setActiveNode(null); set('default') }} />
        ))}
      </div>
    </motion.section>
  )
}

function FloatingNode({ node, index, isMobile, isActive, onEnter, onLeave }: { node: NodeData; index: number; isMobile: boolean; isActive: boolean; onEnter: () => void; onLeave: () => void }) {
  const { t } = useTranslation()
  const circleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!circleRef.current) return
    gsap.fromTo(circleRef.current, { scale: 0, opacity: 0 }, { scale: 0.62, opacity: 1, duration: 0.8, ease: 'back.out(1.4)', delay: 0.4 + index * 0.2 })
  }, [index])

  useEffect(() => {
    if (!circleRef.current) return
    gsap.to(circleRef.current, { scale: isActive ? 0.92 : 0.62, duration: 0.5, ease: 'power3.out' })
  }, [isActive])

  return (
    <motion.div
      className="absolute z-[2]"
      style={{ left: `${(isMobile ? node.mobile : node.desktop).x}%`, top: `${(isMobile ? node.mobile : node.desktop).y}%`, transform: 'translate(-50%, -50%)', width: isMobile ? node.size.mobile : node.size.desktop, height: isMobile ? node.size.mobile : node.size.desktop }}
      animate={{ y: [0, -node.floatDelta, 0] }}
      transition={{ duration: node.floatDuration, repeat: Infinity, ease: 'easeInOut', delay: node.delay }}
      whileHover={{ zIndex: 10 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <span className="absolute left-1/2 font-sans font-black text-white whitespace-nowrap pointer-events-none" style={{ fontSize: 'clamp(24px, 3vw, 48px)', transform: node.labelDown ? 'translateX(-50%) translateY(100%)' : 'translateX(-50%) translateY(-100%)', ...(node.labelDown ? { bottom: 0 } : { top: 0 }), opacity: isActive ? 0 : 1, transition: 'opacity 0.3s ease' }}>
        {t(`about_sections.a1.nodes.${node.id}.label`)}
      </span>
      <div ref={circleRef} className="w-full h-full rounded-full flex flex-col items-center justify-center relative" style={{ backgroundColor: node.bg, border: node.id === 'motion' ? '2px solid rgba(196,181,253,0.45)' : '1px solid transparent', boxShadow: node.id === 'motion' ? '0 0 0 1px rgba(255,255,255,0.12) inset' : 'none', transformOrigin: 'center', willChange: 'transform' }}>
        <div style={{ opacity: isActive ? 1 : 0, transition: 'opacity 0.3s ease', textAlign: 'center', padding: '40px' }}>
          <p className="font-sans font-black mb-3" style={{ color: node.textColor, fontSize: 'clamp(18px, 2.2vw, 32px)' }}>{t(`about_sections.a1.nodes.${node.id}.title`)}</p>
          {(t(`about_sections.a1.nodes.${node.id}.lines`, { returnObjects: true }) as string[]).map((line, i) => (
            <span key={i} className="font-mono block" style={{ color: node.textColor, fontSize: 'clamp(11px, 1.1vw, 16px)', opacity: 0.7, lineHeight: 1.6 }}>{line}</span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
