import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import SplitType from 'split-type'

export const SPRING = `linear(
  0,.0018,.0069 1.15%,.026 2.3%,
  .0637,.1135 5.18%,.2229 7.78%,
  .5977 15.84%,.7014,.7904,.8641,
  .9228,.9676 28.8%,1.0032 31.68%,
  1.0225,1.0352 36.29%,1.0431 38.88%,
  1.046 42.05%,1.0448 44.35%,
  1.0407 47.23%,1.0118 61.63%,
  1.0025 69.41%,.9981 80.35%,1
)`

interface Options {
  trigger: boolean
  delay?: number
  stagger?: number
  duration?: number
  splitBy?: 'words'|'chars'
}

export function useSplitReveal({
  trigger,
  delay = 0,
  stagger = 0.4,
  duration = 0.85,
  splitBy = 'words',
}: Options) {
  const elRef  = useRef<HTMLElement>(null)
  const split  = useRef<SplitType|null>(null)
  const tween  = useRef<gsap.core.Tween|null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    split.current = new SplitType(el, {
      types: 'lines,words',
      lineClass:  'split-line',
      wordClass:  'split-word',
    })

    gsap.set(split.current.words ?? [], {
      y: '115%',
      opacity: 0,
      willChange: 'transform, opacity',
    })

    return () => {
      tween.current?.kill()
      split.current?.revert()
    }
  }, [splitBy])

  useEffect(() => {
    if (!trigger || !split.current) return
    const words = split.current.words ?? []
    if (!words.length) return

    tween.current = gsap.to(words, {
      y: 0,
      opacity: 1,
      duration,
      ease: SPRING,
      stagger: { amount: stagger, from: 'start' },
      delay,
      onComplete: () => gsap.set(words, { willChange: 'auto' }),
    })
  }, [trigger, delay, stagger, duration])

  return elRef
}
