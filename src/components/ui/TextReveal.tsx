/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { clsx } from 'clsx'

type Tag = 'h1'|'h2'|'h3'|'h4'|'p'|'span'|'div'

interface Props {
  children: string
  as?: Tag
  className?: string
  delay?: number
  stagger?: number
  duration?: number
  splitBy?: 'words' | 'chars'
  trigger?: boolean
  autoTrigger?: boolean
  threshold?: number
  style?: CSSProperties
}

export function TextReveal({
  children,
  as: Tag = 'p',
  className,
  delay = 0,
  stagger = 0.4,
  duration = 0.85,
  splitBy = 'words',
  trigger: externalTrigger,
  autoTrigger = true,
  threshold = 0.1,
  style,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [autoFired, setAutoFired] = useState(false)

  useEffect(() => {
    if (!autoTrigger || !wrapRef.current) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setAutoFired(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(wrapRef.current)
    return () => obs.disconnect()
  }, [autoTrigger, threshold])

  const isTriggered = autoTrigger ? autoFired : (externalTrigger ?? false)

  const ref = useSplitReveal({ trigger: isTriggered, delay, stagger, duration, splitBy })

  return (
    <div ref={wrapRef}>
      <Tag ref={ref as any} className={clsx(className)} style={style}>
        {children}
      </Tag>
    </div>
  )
}
