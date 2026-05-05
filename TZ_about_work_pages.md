# ТЗ: Страницы /about и /work — awwwdde
# Основано на реальном HTML indaco.com/about
# Cursor — читай каждую строку, копируй код точно

---

## ВАЖНОЕ ОТКРЫТИЕ ИЗ HTML INDACO

**indaco/about — это НЕ обычная страница со скроллом.**
Это такие же fullscreen секции как на главной, переключающиеся через wheel.
Структура about у indaco:
- Секция 1: текст о команде + большой заголовок с clip-block
- Секция 2: плавающие круги с контактами (floating nodes) на тёмном фоне
- Секция 3: форма контактов

У тебя `/about` будет аналогично — fullscreen слайды, тот же механизм что на Home.
`/work` — единственная страница с обычным скроллом через Lenis.

---

## ФАЙЛЫ КОТОРЫЕ НУЖНО СОЗДАТЬ

```
src/
├── pages/
│   ├── About.tsx               ← fullscreen слайды (как Home)
│   └── Work.tsx                ← обычный скролл + ProjectDetail внутри
│
└── components/
    └── sections/about/
        ├── A0Story.tsx         ← "Rooted in..." — текст о себе
        ├── A1Nodes.tsx         ← плавающие круги со стеком/контактами
        └── A2Contact.tsx       ← форма контактов
```

---

## ОБНОВЛЕНИЕ `src/context/SectionContext.tsx`

У нас два разных провайдера секций — для Home и для About.
Одни и те же файлы, но с разным TOTAL.

```tsx
// Экспортируй фабрику вместо хардкода TOTAL:

export const HOME_TOTAL  = 7
export const ABOUT_TOTAL = 3

// SectionProvider принимает total как пропс:
interface ProviderProps {
  children: ReactNode
  total: number
}

export function SectionProvider({ children, total }: ProviderProps) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [going, setGoing] = useState(false)
  const LOCK_MS = 900

  const goTo = useCallback((i: number) => {
    if (going) return
    if (i < 0 || i >= total) return
    if (i === current) return
    setDir(i > current ? 1 : -1)
    setPrev(current)
    setCurrent(i)
    setGoing(true)
    setTimeout(() => setGoing(false), LOCK_MS)
  }, [current, going, total])

  return (
    <C.Provider value={{ current, prev, dir, going, goTo, total }}>
      {children}
    </C.Provider>
  )
}

// Добавь total в интерфейс контекста:
interface Ctx {
  current: number
  prev: number
  dir: 1 | -1
  going: boolean
  total: number          // ← добавить
  goTo: (i: number) => void
}
```

---

## СТРАНИЦА /about

### `src/pages/About.tsx`

```tsx
import { SectionProvider } from '@/context/SectionContext'
import { useSectionScroll } from '@/hooks/useSectionScroll'
import { useSectionCtx } from '@/context/SectionContext'
import { AnimatePresence, motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { SectionDots } from '@/components/SectionDots'
import { A0Story }   from '@/components/sections/about/A0Story'
import { A1Nodes }   from '@/components/sections/about/A1Nodes'
import { A2Contact } from '@/components/sections/about/A2Contact'

// Фоны трёх секций about
const ABOUT_BG = [
  '#ffffff',  // A0: белый — текст о себе
  '#0D0D0D',  // A1: тёмный — floating nodes (как у indaco)
  '#EDE9FE',  // A2: светло-лавандовый — форма
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
        {current === 1 && <A1Nodes key="a1" />}
        {current === 2 && <A2Contact key="a2" />}
      </AnimatePresence>

      <SectionDots />
      <Footer light={HEADER_LIGHT[current]} />
    </motion.div>
  )
}

export default function About() {
  return (
    // total={3} — три секции на about
    <SectionProvider total={3}>
      <AboutInner />
    </SectionProvider>
  )
}
```

---

## СЕКЦИИ /about

### `src/components/sections/about/A0Story.tsx`

Аналог первой секции indaco/about:
`"Rooted in Emilia, who to trust, bonded since 2012."`
У тебя: заголовок о себе + абзац + маленький факт-список.

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Факты — маленькие карточки под основным текстом
const FACTS_EN = [
  { num: '4+',  label: 'Years of\nbuilding interfaces' },
  { num: '12+', label: 'Projects\nshipped' },
  { num: '100%', label: 'Remote-ready,\nAlways honest' },
]
const FACTS_RU = [
  { num: '4+',  label: 'Лет создаю\nинтерфейсы' },
  { num: '12+', label: 'Проектов\nсдано' },
  { num: '100%', label: 'Удалённо,\nВсегда честно' },
]

export function A0Story() {
  const { t, i18n } = useTranslation()
  const { dir } = useSectionCtx()
  const facts = i18n.language === 'en' ? FACTS_EN : FACTS_RU

  // Строки заголовка — каждая отдельный хук, нарастающий delay
  const r1 = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.28, duration: 0.9 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.25, stagger: 0.28, duration: 0.9 })
  const r3 = useSplitReveal({ trigger: true, delay: 0.4, stagger: 0.28, duration: 0.9 })

  // Параграф — появляется через clip-path (как у indaco)
  const paraRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (!paraRef.current) return
    gsap.fromTo(paraRef.current,
      { clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)', opacity: 0 },
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        opacity: 1,
        duration: 0.9,
        ease: SPRING,
        delay: 0.7,
      }
    )
  }, [])

  // Факты — появляются снизу со stagger
  const factsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!factsRef.current) return
    const items = factsRef.current.querySelectorAll('.fact-item')
    gsap.fromTo(items,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, ease: SPRING, stagger: 0.12, delay: 0.9 }
    )
  }, [])

  return (
    <motion.section
      className="fixed inset-0 flex flex-col justify-center px-10 md:px-16"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      {/* Лейбл — маленький моно текст сверху */}
      <span className="font-mono text-[11px] uppercase tracking-widest text-muted block mb-10">
        awwwdde — Creative Developer & Designer
      </span>

      {/* Заголовок — три строки, огромный шрифт, слова вылетают снизу */}
      {/* Точно как у indaco: clip-path на строку, translateY на слова */}
      <div>
        <h1
          ref={r1 as any}
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(44px, 7.5vw, 120px)' }}
        >
          {i18n.language === 'en' ? 'Based in Russia,' : 'Из России,'}
        </h1>

        {/* Вторая строка: часть текста + лавандовая плашка */}
        {/* Точная копия механики indaco: clip_on_enter */}
        <div
          className="flex items-baseline gap-[0.2em] flex-wrap"
          style={{ fontSize: 'clamp(44px, 7.5vw, 120px)' }}
        >
          <h1
            ref={r2 as any}
            className="font-sans font-black text-ink leading-[0.92] tracking-tight inline"
          >
            {i18n.language === 'en' ? 'building things' : 'строю вещи'}
          </h1>
          {/* Лавандовая плашка — анимируется отдельно через clip-path */}
          <ClipBlock
            text={i18n.language === 'en' ? 'that move.' : 'которые живут.'}
            delay={0.4}
          />
        </div>

        <h1
          ref={r3 as any}
          className="font-sans font-black text-ink/20 leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(44px, 7.5vw, 120px)' }}
        >
          {i18n.language === 'en' ? 'since 2021.' : 'с 2021 года.'}
        </h1>
      </div>

      {/* Параграф — появляется через clip-path слева направо */}
      {/* Это точная механика indaco/about: polygon(0 0, 0 0...) → polygon(0 0, 100% 0...) */}
      <p
        ref={paraRef}
        className="font-sans text-[clamp(15px,1.3vw,20px)] text-ink/50 leading-relaxed max-w-lg mt-10"
        style={{ clipPath: 'polygon(0 0, 0 0, 0 100%, 0 100%)' }}
      >
        {i18n.language === 'en'
          ? `I come from different backgrounds — design, code, and a lot of late nights.
That mix is what makes my work feel alive.
I build interfaces that move, breathe, and get out of the way when they should.`
          : `Я пришёл из разных областей — дизайн, код и много поздних ночей.
Этот микс делает мою работу живой.
Я строю интерфейсы которые двигаются, дышат и уходят в сторону когда нужно.`}
      </p>

      {/* Факты — три карточки снизу */}
      <div ref={factsRef} className="flex gap-8 mt-12">
        {facts.map((fact) => (
          <div key={fact.num} className="fact-item">
            <span
              className="font-sans font-black text-lav block"
              style={{ fontSize: 'clamp(28px, 3.5vw, 56px)', lineHeight: 1 }}
            >
              {fact.num}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted whitespace-pre-line block mt-1">
              {fact.label}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  )
}

// ClipBlock — лавандовая плашка с анимацией раскрытия
// Точная копия .clip_on_enter у indaco:
// clip-path: polygon(-30% 0, 0 0, 0 120%, -30% 120%) → polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)
function ClipBlock({ text, delay }: { text: string; delay: number }) {
  const wrapRef = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!wrapRef.current || !textRef.current) return

    // Плашка раскрывается слева направо (polygon)
    gsap.fromTo(wrapRef.current,
      { clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' },
      {
        clipPath: 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)',
        duration: 0.75,
        ease: SPRING,
        delay,
      }
    )
    // Текст внутри вылетает снизу
    gsap.fromTo(textRef.current,
      { y: '115%', opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay: delay + 0.05 }
    )
  }, [delay])

  return (
    <span
      ref={wrapRef}
      className="inline-block bg-lav px-[0.18em] overflow-hidden rounded-sm"
      style={{ clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' }}
    >
      <span
        ref={textRef}
        className="inline-block font-sans font-black text-ink leading-[0.92]"
        style={{ display: 'inline-block', transform: 'translateY(115%)' }}
      >
        {text}
      </span>
    </span>
  )
}
```

---

### `src/components/sections/about/A1Nodes.tsx`

Это точная копия секции с floating nodes у indaco.
У indaco: три плавающих круга (офисы Turin, Milan, Reggio Emilia) соединены линиями.
У тебя: три круга — твой стек / контакты / соцсети. Тёмный фон.

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { useCursor } from '@/context/CursorContext'
import { useRef, useEffect, useState } from 'react'
import gsap from 'gsap'

// Данные трёх кругов
// У indaco: города с адресами. У тебя: категории твоего стека
const NODES = [
  {
    id: 'frontend',
    label: 'Frontend',
    bg: '#ffffff',      // белый круг
    textColor: '#0D0D0D',
    position: { left: '20%', top: '58%' },
    floatOffset: '-30px',
    floatDuration: '4.5s',
    delay: '0s',
    labelDown: false,   // лейбл сверху
    content: {
      title: 'Frontend',
      lines: ['React. TypeScript.', 'Tailwind. Vite.', 'Pixel-perfect.'],
    },
  },
  {
    id: 'motion',
    label: 'Motion',
    bg: '#0D0D0D',      // тёмный круг (как Milan у indaco)
    textColor: '#ffffff',
    position: { left: '50%', top: '43%' },
    floatOffset: '-35px',
    floatDuration: '5.2s',
    delay: '0.3s',
    labelDown: false,
    content: {
      title: 'Motion',
      lines: ['GSAP. Framer Motion.', 'Lenis. Scroll magic.', 'UI choreography.'],
    },
  },
  {
    id: 'design',
    label: 'Design',
    bg: '#C4B5FD',      // лавандовый круг (как лаймовый у indaco)
    textColor: '#0D0D0D',
    position: { left: '80%', top: '53%' },
    floatOffset: '-25px',
    floatDuration: '4.8s',
    delay: '0.6s',
    labelDown: true,    // лейбл снизу
    content: {
      title: 'Design',
      lines: ['Figma. UI Systems.', 'Interaction design.', 'Visual thinking.'],
    },
  },
]

export function A1Nodes() {
  const { t, i18n } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [activeNode, setActiveNode] = useState<string | null>(null)

  // Заголовок секции
  const rTitle = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.25, duration: 0.85 })

  // SVG линии между кругами — анимируются через stroke-dashoffset
  const lineRef1 = useRef<SVGPathElement>(null)
  const lineRef2 = useRef<SVGPathElement>(null)

  useEffect(() => {
    // Линии появляются после задержки — как у indaco
    [lineRef1, lineRef2].forEach((ref, i) => {
      if (!ref.current) return
      gsap.to(ref.current, {
        strokeDashoffset: 0,
        opacity: 1,
        duration: 1.2,
        ease: 'power2.out',
        delay: 0.5 + i * 0.15,
      })
    })
  }, [])

  return (
    <motion.section
      className="fixed inset-0 flex flex-col justify-start pt-[110px] px-10 overflow-hidden"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      {/* Заголовок секции — белый текст на тёмном фоне */}
      <h2
        ref={rTitle as any}
        className="font-sans font-black text-white relative z-10"
        style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}
      >
        {i18n.language === 'en' ? 'What I bring\nto the table.' : 'Что я\nпривношу.'}
      </h2>

      {/* SVG слой для линий между кругами */}
      {/* Линии: stroke-dasharray:2000, stroke-dashoffset:2000 → 0 */}
      {/* Это точная механика indaco/about connections */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-[1]"
        style={{ overflow: 'visible' }}
      >
        {/* Линия 1: Frontend → Motion */}
        <path
          ref={lineRef1}
          d="M 20% 58% Q 35% 30% 50% 43%"
          fill="none"
          stroke="rgba(196,181,253,0.3)"
          strokeWidth="2"
          strokeDasharray="2000"
          strokeDashoffset="2000"
          style={{ opacity: 0 }}
        />
        {/* Линия 2: Motion → Design */}
        <path
          ref={lineRef2}
          d="M 50% 43% Q 65% 25% 80% 53%"
          fill="none"
          stroke="rgba(196,181,253,0.3)"
          strokeWidth="2"
          strokeDasharray="2000"
          strokeDashoffset="2000"
          style={{ opacity: 0 }}
        />
      </svg>

      {/* Floating Nodes — три плавающих круга */}
      {NODES.map((node, i) => (
        <FloatingNode
          key={node.id}
          node={node}
          index={i}
          isActive={activeNode === node.id}
          onEnter={() => { setActiveNode(node.id); set('view') }}
          onLeave={() => { setActiveNode(null); set('default') }}
        />
      ))}
    </motion.section>
  )
}

// FloatingNode — один плавающий круг
// Точная копия .i-floating-node у indaco:
// - float animation через CSS keyframes
// - scale(0) → scale(0.417) при появлении
// - при hover: scale до 1 и показ контента
interface NodeData {
  id: string
  label: string
  bg: string
  textColor: string
  position: { left: string; top: string }
  floatOffset: string
  floatDuration: string
  delay: string
  labelDown: boolean
  content: { title: string; lines: string[] }
}

function FloatingNode({
  node,
  index,
  isActive,
  onEnter,
  onLeave,
}: {
  node: NodeData
  index: number
  isActive: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const circleRef = useRef<HTMLDivElement>(null)

  // Появление круга: scale 0 → 0.417 с spring
  useEffect(() => {
    if (!circleRef.current) return
    gsap.fromTo(circleRef.current,
      { scale: 0, opacity: 0 },
      {
        scale: 0.417,
        opacity: 1,
        duration: 0.8,
        ease: 'back.out(1.4)',
        delay: 0.4 + index * 0.2,
      }
    )
  }, [index])

  // Hover: scale до 1
  useEffect(() => {
    if (!circleRef.current) return
    gsap.to(circleRef.current, {
      scale: isActive ? 1 : 0.417,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
    })
  }, [isActive])

  return (
    <div
      className="absolute z-[2]"
      style={{
        left: node.position.left,
        top: node.position.top,
        transform: 'translate(-50%, -50%)',
        width: 'clamp(280px, 28vw, 420px)',
        height: 'clamp(280px, 28vw, 420px)',
        // Float анимация — точно как у indaco
        animation: `nodeFloat ${node.floatDuration} ease-in-out infinite`,
        animationDelay: node.delay,
      }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Лейбл над/под кругом — виден когда круг маленький */}
      <span
        className="absolute left-1/2 font-sans font-black text-white whitespace-nowrap pointer-events-none"
        style={{
          fontSize: 'clamp(24px, 3vw, 48px)',
          transform: 'translateX(-50%)',
          [node.labelDown ? 'bottom' : 'top']: 0,
          [node.labelDown ? 'transform' : 'transform']: 'translateX(-50%) ' + (node.labelDown ? 'translateY(100%)' : 'translateY(-100%)'),
          opacity: isActive ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
      >
        {node.label}
      </span>

      {/* Сам круг */}
      <div
        ref={circleRef}
        className="w-full h-full rounded-full flex flex-col items-center justify-center relative"
        style={{
          backgroundColor: node.bg,
          transformOrigin: 'center',
          willChange: 'transform',
        }}
      >
        {/* Контент внутри круга — виден только при hover (isActive) */}
        <div
          style={{
            opacity: isActive ? 1 : 0,
            transition: 'opacity 0.3s ease',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <p
            className="font-sans font-black mb-3"
            style={{ color: node.textColor, fontSize: 'clamp(18px, 2.2vw, 32px)' }}
          >
            {node.content.title}
          </p>
          {node.content.lines.map((line, i) => (
            <span
              key={i}
              className="font-mono block"
              style={{
                color: node.textColor,
                fontSize: 'clamp(11px, 1.1vw, 16px)',
                opacity: 0.7,
                lineHeight: 1.6,
              }}
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**CSS для float анимации — добавь в `src/index.css`:**

```css
/* Float animation для nodes — точно как у indaco */
@keyframes nodeFloat {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  50%       { transform: translate(-50%, -50%) translateY(var(--float-offset, -30px)); }
}
```

**Но CSS переменная `--float-offset` через inline style не работает с Tailwind.**
Вместо этого — используй motion.div с animate:

```tsx
// Замени внешний div в FloatingNode на motion.div:
<motion.div
  className="absolute z-[2]"
  style={{ left: node.position.left, top: node.position.top, transform: 'translate(-50%, -50%)' }}
  animate={{ y: [0, -30, 0] }}
  transition={{
    duration: parseFloat(node.floatDuration),
    repeat: Infinity,
    ease: 'easeInOut',
    delay: parseFloat(node.delay),
  }}
>
```

---

### `src/components/sections/about/A2Contact.tsx`

Точная копия секции с формой у indaco/about:
- Большой заголовок
- Форма с тремя инпутами в сетке (Name / Mail / Message)
- Кнопка отправки
- При submit: форма закрывается через scaleX(0), появляется "Thank you"

```tsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from '@/components/sections/sectionVariants'
import { useCursor } from '@/context/CursorContext'
import gsap from 'gsap'

export function A2Contact() {
  const { t, i18n } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [sent, setSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const r1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.2, stagger: 0.25 })

  // Инпуты и кнопка — появляются через clip-path + translateY
  // Точно как у indaco: clip-path:polygon(0 0,100% 0,100% 0,0 0) → polygon(0 0,100% 0,100% 100%,0 100%)
  useEffect(() => {
    if (!formRef.current) return
    const els = formRef.current.querySelectorAll('input, button[type="submit"]')
    gsap.fromTo(els,
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)',
        y: 60,
        opacity: 0,
      },
      {
        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: SPRING,
        stagger: 0.1,   // каждый элемент с задержкой 0.1s
        delay: 0.5,
      }
    )
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return

    // Форма закрывается: scaleX(0) с transform-origin: right
    // Точно как у indaco: form.formsubmitted → before { transform: scaleX(1) }
    gsap.to(formRef.current, {
      scaleX: 0,
      transformOrigin: 'right center',
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => setSent(true),
    })
  }

  const inputClass = `
    w-full rounded-xl px-5 py-4 border-none outline-none
    bg-black/5 font-sans text-[clamp(13px,1vw,16px)] text-ink
    placeholder:text-ink/40 placeholder:uppercase placeholder:tracking-widest placeholder:font-mono
    focus:bg-lav/20 transition-colors
  `

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-10 md:px-16"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      {/* Заголовок */}
      <div className="w-full max-w-2xl">
        <h2
          ref={r1 as any}
          className="font-sans font-black text-ink"
          style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}
        >
          {i18n.language === 'en' ? 'Got a project?' : 'Есть проект?'}
        </h2>
        <h2
          ref={r2 as any}
          className="font-sans font-black text-lav-dark mb-10"
          style={{ fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: 1.0 }}
        >
          {i18n.language === 'en' ? "Let's talk." : 'Давай поговорим.'}
        </h2>

        <AnimatePresence mode="wait">
          {!sent ? (
            <form
              key="form"
              ref={formRef}
              onSubmit={handleSubmit}
              className="w-full"
              style={{ transformOrigin: 'right center' }}
            >
              {/* Сетка инпутов — точно как у indaco: grid-areas "a b" "c c" */}
              <div
                className="grid gap-4 mb-4"
                style={{ gridTemplateAreas: '"a b" "c c"', gridTemplateColumns: '1fr 1fr' }}
              >
                <input
                  style={{ gridArea: 'a' }}
                  className={inputClass}
                  type="text"
                  placeholder={i18n.language === 'en' ? 'Name' : 'Имя'}
                  required
                  onMouseEnter={() => set('text')}
                  onMouseLeave={() => set('default')}
                />
                <input
                  style={{ gridArea: 'b' }}
                  className={inputClass}
                  type="email"
                  placeholder="Email"
                  required
                  onMouseEnter={() => set('text')}
                  onMouseLeave={() => set('default')}
                />
                <input
                  style={{ gridArea: 'c' }}
                  className={inputClass}
                  type="text"
                  placeholder={i18n.language === 'en' ? 'Message' : 'Сообщение'}
                  required
                  onMouseEnter={() => set('text')}
                  onMouseLeave={() => set('default')}
                />
              </div>

              {/* Кнопка отправки */}
              {/* У indaco — маленькая кнопка с иконкой send_icon.png справа */}
              {/* У тебя — кнопка с текстом + магнитный эффект */}
              <div className="flex items-center justify-between mt-2">
                <button
                  type="submit"
                  className="bg-lav text-ink font-sans font-bold px-8 py-3 rounded-full hover:bg-lav-dark transition-colors"
                  onMouseEnter={() => set('pointer')}
                  onMouseLeave={() => set('default')}
                  style={{
                    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', // начальное — скрыто
                  }}
                >
                  {i18n.language === 'en' ? 'Send it →' : 'Отправить →'}
                </button>

                {/* Email напрямую */}
                <div className="text-right">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-1">
                    {i18n.language === 'en' ? 'or email directly' : 'или напишите напрямую'}
                  </span>
                  <a
                    href="mailto:vlad@awwwdde.com"
                    className="font-sans font-semibold text-ink hover:text-lav-dark transition-colors"
                    style={{ fontSize: 'clamp(13px, 1vw, 17px)' }}
                    onMouseEnter={() => set('pointer')}
                    onMouseLeave={() => set('default')}
                  >
                    vlad@awwwdde.com
                  </a>
                </div>
              </div>
            </form>
          ) : (
            // Thank you — появляется после отправки
            // У indaco: form::after { content: "Thank you for reaching out!" }
            // У тебя: motion.div с анимацией
            <motion.div
              key="thanks"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="py-12"
            >
              <p
                className="font-sans font-black text-lav-dark"
                style={{ fontSize: 'clamp(24px, 3vw, 48px)' }}
              >
                {i18n.language === 'en'
                  ? 'Got it. I\'ll be in touch soon.'
                  : 'Получил. Скоро напишу.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}
```

---

## СТРАНИЦА /work — обычный скролл

`/work` — единственная страница с Lenis-скроллом.
Список всех проектов + отдельная страница каждого проекта.

### `src/pages/Work.tsx`

```tsx
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TextReveal } from '@/components/ui/TextReveal'
import { useCursor } from '@/context/CursorContext'

// Слаги всех проектов — в порядке отображения
const SLUGS = ['pickupservice', 'kitluna', 'linkavto', 'awwwdde', 'abrikosova']

// Цвета акцентов для каждого проекта (hover цвет строки)
// Подбери под реальные цвета проектов
const PROJECT_ACCENTS: Record<string, string> = {
  pickupservice: '#1a1a1a',   // тёмный — внедорожники
  kitluna:       '#C4B5FD',   // лаванда — агентство
  linkavto:      '#2563EB',   // синий — маркетплейс
  awwwdde:       '#C4B5FD',   // лаванда — этот сайт
  abrikosova:    '#FCA5A5',   // нежно-розовый — кондитер
}

export default function Work() {
  const { t, i18n } = useTranslation()
  const { set } = useCursor()

  return (
    <div className="bg-white text-ink min-h-screen">

      {/* ── HERO ── */}
      <section className="pt-40 pb-24 px-10 md:px-16">

        {/* Лейбл */}
        <TextReveal
          as="span"
          className="font-mono text-[11px] uppercase tracking-widest text-muted block mb-10"
          stagger={0.2}
          delay={0.1}
        >
          {i18n.language === 'en' ? 'Selected Work' : 'Избранные работы'}
        </TextReveal>

        {/* Заголовок — два слова, каждое на своей строке */}
        {/* Третья строка — приглушённый цвет, как у indaco */}
        <TextReveal
          as="h1"
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 140px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.2}
        >
          {i18n.language === 'en' ? 'Things' : 'Проекты'}
        </TextReveal>
        <TextReveal
          as="h1"
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 140px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.35}
        >
          {i18n.language === 'en' ? 'I built.' : 'которые я'}
        </TextReveal>
        <TextReveal
          as="h1"
          className="font-sans font-black text-ink/15 leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(52px, 9vw, 140px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.5}
        >
          {i18n.language === 'en' ? '& shipped.' : 'сделал.'}
        </TextReveal>
      </section>

      {/* ── СПИСОК ПРОЕКТОВ ── */}
      {/* Горизонтальные строки с разделителями — как у indaco/portfolio */}
      <section className="px-10 md:px-16 pb-32">
        <div className="divide-y divide-ink/8">
          {SLUGS.map((slug, i) => (
            <ProjectRow
              key={slug}
              slug={slug}
              index={i}
              accent={PROJECT_ACCENTS[slug]}
            />
          ))}
        </div>
      </section>

    </div>
  )
}

// ProjectRow — одна строка проекта
// При hover: строка подсвечивается акцентным цветом, курсор меняется на VIEW
// Смещается вправо через motion.div

function ProjectRow({
  slug,
  index,
  accent,
}: {
  slug: string
  index: number
  accent: string
}) {
  const { t, i18n } = useTranslation()
  const { set } = useCursor()

  const title   = t(`projects.${slug}.title`)
  const tagline = t(`projects.${slug}.tagline`)
  const tags    = t(`projects.${slug}.tags`, { returnObjects: true }) as string[]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.05 }}
    >
      <Link
        to={`/work/${slug}`}
        className="group flex items-center justify-between py-8 md:py-10 gap-6 relative overflow-hidden"
        onMouseEnter={() => set('view')}
        onMouseLeave={() => set('default')}
      >
        {/* Hover background — акцентный цвет заливает строку */}
        <motion.div
          className="absolute inset-0 -z-10"
          style={{ backgroundColor: accent, originX: 0 }}
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />

        {/* Номер */}
        <span className="font-mono text-[11px] text-muted w-8 flex-shrink-0 group-hover:text-ink transition-colors">
          {String(index + 1).padStart(2, '0')}
        </span>

        {/* Название + тэглайн */}
        <div className="flex-grow min-w-0">
          <motion.h2
            className="font-sans font-black text-ink leading-tight group-hover:text-white transition-colors duration-300"
            style={{ fontSize: 'clamp(24px, 3.5vw, 56px)' }}
            whileHover={{ x: 8 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {title}
          </motion.h2>
          <p className="font-mono text-[11px] text-muted uppercase tracking-widest mt-1 group-hover:text-white/60 transition-colors">
            {tagline}
          </p>
        </div>

        {/* Теги — скрыты на мобиле */}
        <div className="hidden md:flex gap-2 flex-wrap justify-end max-w-[280px] flex-shrink-0">
          {tags.map(tag => (
            <span
              key={tag}
              className="font-mono text-[10px] text-muted border border-ink/10 px-3 py-1 rounded-full group-hover:border-white/20 group-hover:text-white/60 transition-colors"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Стрелка */}
        <motion.span
          className="font-mono text-[18px] text-ink/20 group-hover:text-white flex-shrink-0 transition-colors"
          whileHover={{ x: 6 }}
          transition={{ duration: 0.3 }}
        >
          →
        </motion.span>
      </Link>
    </motion.div>
  )
}
```

---

### `src/pages/ProjectDetail.tsx`

```tsx
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { TextReveal } from '@/components/ui/TextReveal'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { useCursor } from '@/context/CursorContext'

const SLUGS = ['pickupservice', 'kitluna', 'linkavto', 'awwwdde', 'abrikosova']

const PROJECT_LINKS: Record<string, string> = {
  pickupservice: 'https://pickupservice.moscow/',
  linkavto:      'https://linkavto.ru/',
  abrikosova:    'https://www.abrikosova-elena.ru/',
}

// Заглушки изображений — замени на реальные пути
const PROJECT_IMAGES: Record<string, string> = {
  pickupservice: '/images/pickupservice.jpg',
  kitluna:       '/images/kitluna.jpg',
  linkavto:      '/images/linkavto.jpg',
  awwwdde:       '/images/awwwdde.jpg',
  abrikosova:    '/images/abrikosova.jpg',
}

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const { set } = useCursor()

  if (!slug || !SLUGS.includes(slug)) {
    return (
      <div className="pt-40 px-10 text-center">
        <p className="font-mono text-muted">Project not found.</p>
        <Link to="/work" className="text-ink underline mt-4 block">← Back to work</Link>
      </div>
    )
  }

  const title   = t(`projects.${slug}.title`)
  const tagline = t(`projects.${slug}.tagline`)
  const desc    = t(`projects.${slug}.desc`)
  const tags    = t(`projects.${slug}.tags`, { returnObjects: true }) as string[]
  const link    = PROJECT_LINKS[slug]
  const imgSrc  = PROJECT_IMAGES[slug]

  // Следующий проект
  const nextSlug = SLUGS[(SLUGS.indexOf(slug) + 1) % SLUGS.length]

  return (
    <div className="bg-white text-ink">

      {/* ── ШАПКА ПРОЕКТА ── */}
      <section className="pt-40 pb-16 px-10 md:px-16">

        {/* Хлебные крошки — назад к работам */}
        <Link
          to="/work"
          className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-ink transition-colors block mb-16"
          onMouseEnter={() => set('pointer')}
          onMouseLeave={() => set('default')}
        >
          ← {i18n.language === 'en' ? 'All work' : 'Все работы'}
        </Link>

        {/* Заголовок проекта */}
        <TextReveal
          as="h1"
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(44px, 8vw, 130px)' } as any}
          stagger={0.25}
          duration={1.0}
          delay={0.1}
        >
          {title}
        </TextReveal>

        {/* Тэглайн — лавандовый цвет */}
        <TextReveal
          as="p"
          className="font-sans font-black text-lav-dark mt-2"
          style={{ fontSize: 'clamp(20px, 3vw, 48px)' } as any}
          stagger={0.25}
          delay={0.25}
        >
          {tagline}
        </TextReveal>
      </section>

      {/* ── ГЛАВНОЕ ИЗОБРАЖЕНИЕ ── */}
      {/* aspect-video на десктопе, квадрат на мобиле */}
      <section className="px-10 md:px-16 mb-20">
        <motion.div
          className="w-full overflow-hidden rounded-2xl bg-lav-bg"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Заглушка — замени на реальное изображение */}
          <div className="aspect-video w-full flex items-center justify-center bg-surface">
            <span className="font-mono text-[11px] text-muted uppercase tracking-widest">
              {title} — Preview
            </span>
            {/* Когда будут реальные изображения: */}
            {/* <img src={imgSrc} alt={title} className="w-full h-full object-cover" /> */}
          </div>
        </motion.div>
      </section>

      {/* ── ОПИСАНИЕ + МЕТА ── */}
      <section className="px-10 md:px-16 mb-24">
        <div className="grid md:grid-cols-3 gap-16">

          {/* Описание — занимает 2 колонки */}
          <div className="md:col-span-2">
            <TextReveal
              as="p"
              className="font-sans text-ink/60 leading-relaxed"
              style={{ fontSize: 'clamp(16px, 1.4vw, 22px)' } as any}
              stagger={0.3}
            >
              {desc}
            </TextReveal>
          </div>

          {/* Мета — правая колонка */}
          <div className="flex flex-col gap-10">

            {/* Стек / теги */}
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-4">
                {i18n.language === 'en' ? 'Delivered' : 'Что сделано'}
              </span>
              <div className="flex flex-col gap-2">
                {tags.map(tag => (
                  <span key={tag} className="font-sans text-[clamp(14px,1vw,18px)] text-ink">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Ссылка на живой сайт */}
            {link && (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-4">
                  {i18n.language === 'en' ? 'Live' : 'Смотреть'}
                </span>
                <MagneticButton
                  href={link}
                  variant="outline"
                >
                  {i18n.language === 'en' ? 'Visit site →' : 'Открыть сайт →'}
                </MagneticButton>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ── СЛЕДУЮЩИЙ ПРОЕКТ ── */}
      {/* Большая кликабельная строка внизу — как у indaco */}
      <section className="px-10 md:px-16 py-20 border-t border-ink/8">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted block mb-8">
          {i18n.language === 'en' ? 'Next project' : 'Следующий проект'}
        </span>

        <Link
          to={`/work/${nextSlug}`}
          className="group flex items-center justify-between"
          onMouseEnter={() => set('view')}
          onMouseLeave={() => set('default')}
        >
          <motion.h2
            className="font-sans font-black text-ink group-hover:text-lav-dark transition-colors duration-300"
            style={{ fontSize: 'clamp(32px, 6vw, 96px)' }}
            whileHover={{ x: 12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {t(`projects.${nextSlug}.title`)}
          </motion.h2>
          <motion.span
            className="font-mono text-[clamp(24px,4vw,64px)] text-ink/20 group-hover:text-lav-dark transition-colors"
            whileHover={{ x: 16 }}
            transition={{ duration: 0.4 }}
          >
            →
          </motion.span>
        </Link>
      </section>

    </div>
  )
}
```

---

## ОБНОВЛЕНИЕ `src/App.tsx` — роутинг

```tsx
// Добавь маршрут /about
// About — fullscreen слайды (как Home), поэтому НЕ оборачивается в ScrollLayout

import About from '@/pages/About'

// В ScrollLayout — проверяй и /about:
function ScrollLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  // Fullscreen страницы — без Lenis и без обёрток
  const isFullscreen = pathname === '/' || pathname === '/about'

  useEffect(() => {
    if (isFullscreen) return
    const lenis = new Lenis({ duration: 1.3, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => { lenis.destroy(); gsap.ticker.remove(tick) }
  }, [isFullscreen])

  if (isFullscreen) return <>{children}</>

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

// Маршруты:
<Routes>
  <Route path="/"            element={<Home />} />
  <Route path="/about"       element={<About />} />   {/* fullscreen */}
  <Route path="/work"        element={<Work />} />
  <Route path="/work/:slug"  element={<ProjectDetail />} />
</Routes>
```

---

## ЧЕКЛИСТ

### /about — критично
- [ ] `SectionProvider` принимает `total` как пропс — 3 для about, 7 для home
- [ ] `useSectionScroll` вешает `body.home-page` (overflow:hidden) — работает и на /about
- [ ] Float анимация через `motion.div` с `animate={{ y: [0, -30, 0] }}` и `repeat: Infinity`
- [ ] SVG линии: `strokeDashoffset: 2000 → 0` через GSAP, `delay` на каждую
- [ ] ClipBlock: `clipPath polygon(-30% 0, 0% 0...) → polygon(-30% 0, 130% 0...)` через GSAP
- [ ] Параграф в A0Story: `clipPath polygon(0 0, 0 0...) → polygon(0 0, 100% 0...)` через GSAP
- [ ] Инпуты в A2Contact: `clip-path + translateY` через GSAP stagger на каждый
- [ ] Submit: `scaleX(0)` на форму → `setSent(true)` в `onComplete`
- [ ] Три фона: `['#ffffff', '#0D0D0D', '#EDE9FE']` — меняются через `motion.div animate`

### /work — критично
- [ ] Hover на строке: `motion.div scaleX 0→1` с акцентным цветом (разным для каждого проекта)
- [ ] Текст в строке: `group-hover:text-white` — меняется при hover на строку
- [ ] `TextReveal` с `autoTrigger={true}` — срабатывает при скролле через IntersectionObserver
- [ ] Лаванда используется только как акцент для kitluna и awwwdde
- [ ] Следующий проект: циклически через `(index + 1) % SLUGS.length`

### Общее
- [ ] `ProjectImages` — замени заглушки на реальные пути когда будут скриншоты
- [ ] `vlad@awwwdde.com` — замени на реальный email
- [ ] Соцсети в Footer — замени на реальные ссылки
