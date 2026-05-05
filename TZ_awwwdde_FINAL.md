# ФИНАЛЬНОЕ ТЗ: awwwdde.com
# Полная копия механики indaco.com + твой контент + лавандовый цвет
# Cursor — копируй код точно, не придумывай ничего от себя

---

## АРХИТЕКТУРА В ДВУХ СЛОВАХ

```
/ (Home)          → fullscreen слайды как indaco, overflow:hidden на body, нет скролла
/work             → обычная страница со скроллом через Lenis
/work/:slug       → страница проекта со скроллом
/about            → обычная страница со скроллом
```

Главная — это НЕ скролл. Это смена полноэкранных слайдов через wheel/touch/keyboard.
На /work и /about — нормальный плавный скролл через Lenis.

---

## 1. УСТАНОВКА

```bash
npm create vite@latest awwwdde -- --template react-ts
cd awwwdde

npm install gsap @gsap/react framer-motion lenis split-type react-router-dom i18next react-i18next clsx

npm install -D tailwindcss postcss autoprefixer @types/split-type
npx tailwindcss init -p
```

---

## 2. СТРУКТУРА ФАЙЛОВ

```
src/
├── main.tsx
├── App.tsx
├── index.css
├── i18n.ts
│
├── locales/
│   ├── en.json
│   └── ru.json
│
├── context/
│   ├── CursorContext.tsx
│   └── SectionContext.tsx        ← только для главной
│
├── hooks/
│   ├── useCursor.ts              ← GSAP quickTo
│   ├── useSectionScroll.ts       ← wheel/touch/keyboard hijack
│   ├── useMagnetic.ts            ← FM useSpring магнит
│   └── useSplitReveal.ts         ← ГЛАВНАЯ анимация текста
│
├── components/
│   ├── CustomCursor.tsx
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── LangSwitcher.tsx
│   ├── SectionDots.tsx           ← боковые точки-навигация
│   │
│   └── ui/
│       ├── TextReveal.tsx        ← обёртка над useSplitReveal
│       ├── ClipWord.tsx          ← лавандовая плашка с текстом
│       ├── MagneticButton.tsx
│       └── WordRotator.tsx       ← ротация слов
│
└── pages/
    ├── Home.tsx                  ← собирает 7 секций
    ├── Work.tsx
    ├── ProjectDetail.tsx
    └── About.tsx
```

---

## 3. `tailwind.config.js`

```js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lav:        '#C4B5FD',   // главный акцент — лаванда
        'lav-dark': '#A78BFA',   // hover состояние лаванды
        'lav-bg':   '#EDE9FE',   // светлый лавандовый фон секций
        ink:        '#0D0D0D',   // почти чёрный
        muted:      '#9CA3AF',
        surface:    '#F9F9F9',
      },
      fontFamily: {
        // Onest — единственный шрифт. Поддерживает EN и RU одинаково.
        sans: ['"Onest"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

---

## 4. `src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Onest:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html { -webkit-font-smoothing: antialiased; }

  body {
    font-family: 'Onest', sans-serif;
    background: #ffffff;
    color: #0D0D0D;
    cursor: none;
  }

  /* Класс который вешается на body ТОЛЬКО на главной странице */
  body.home-page {
    overflow: hidden;
    overscroll-behavior: none;
    touch-action: none;
    height: 100dvh;
  }

  ::selection { background: #C4B5FD; color: #0D0D0D; }
  ::-webkit-scrollbar { width: 0; }
}

/* ── Анимация текста: строки скрываются через overflow ─────────────────── */
/* SplitType добавляет класс .split-line каждой строке */
/* Мы вешаем overflow:hidden на строку, чтобы слова выезжали из-за края */
.split-line {
  overflow: hidden !important;
  display: block !important;
}

/* Начальное состояние слов — спрятаны снизу */
/* GSAP анимирует их до y:0 */
.word-init {
  display: inline-block;
  transform: translateY(115%);
  opacity: 0;
  will-change: transform, opacity;
}
```

---

## 5. ЛОКАЛИЗАЦИЯ

### `src/locales/en.json`
```json
{
  "nav": {
    "work": "Work",
    "about": "About",
    "contact": "Contact"
  },
  "s0": {
    "line1": "Think of a Color",
    "pre": "It's",
    "clip": "Lavender",
    "post": "isn't it?"
  },
  "s1": {
    "l1": "Next time you look",
    "l2": "for something real,",
    "l3": "you'll know",
    "clip": "where to go."
  },
  "s2": {
    "l1": "I'm a Creative Developer",
    "l2": "with a",
    "rotating": ["thoughtful", "precise", "minimal", "honest"],
    "l3": "approach."
  },
  "s3": {
    "title1": "Simple process.",
    "title2": "Real results.",
    "step1_title": "Understand",
    "step1_desc": "I dig into the brief. Ask the right questions. Find what really matters.",
    "step2_title": "Build",
    "step2_desc": "Design and code in parallel. Fast iterations. Tight feedback loops.",
    "step3_title": "Ship",
    "step3_desc": "On time. Pixel-perfect. Ready to scale."
  },
  "s4": {
    "title1": "Ideas come in",
    "title2": "many shapes.",
    "cards": [
      { "title": "Frontend",  "body": "React. TypeScript.\nTailwind. Vite.\nPixel-perfect." },
      { "title": "Motion",    "body": "GSAP. Framer Motion.\nLenis. Scroll magic.\nUI choreography." },
      { "title": "Design",    "body": "Figma. UI Systems.\nInteraction design.\nClean visual thinking." },
      { "title": "Strategy",  "body": "Digital positioning.\nContent structure.\nHonest communication." }
    ]
  },
  "s5": {
    "title1": "I let the work",
    "title2": "do the talking.",
    "cta": "See all work →"
  },
  "s6": {
    "title1": "Got a project?",
    "title2": "Let's talk.",
    "name": "Your name",
    "email": "Your email",
    "budget": "Your budget",
    "submit": "Send it →",
    "success": "Got it. I'll be in touch soon.",
    "or": "or email directly"
  },
  "footer": { "made": "Designed & built by awwwdde", "year": "2025" },
  "projects": {
    "pickupservice": {
      "title": "Pickup Service",
      "tagline": "Where serious off-road begins.",
      "desc": "Business card site for a Moscow SUV tuning garage. Dark, bold, mechanical — designed to match the machines they build.",
      "tags": ["UI Design", "Development", "Branding"],
      "link": "https://pickupservice.moscow/"
    },
    "kitluna": {
      "title": "KitLuna",
      "tagline": "A studio that builds studios.",
      "desc": "Website for a web and software development agency. Clean system, clear hierarchy — built to convert.",
      "tags": ["UI Design", "React", "Motion"]
    },
    "linkavto": {
      "title": "LinkAvto",
      "tagline": "Every part. Every car.",
      "desc": "Marketplace for auto parts. Complex catalog, fast search, smooth UX across 50k+ SKUs.",
      "tags": ["React", "TypeScript", "UX Design"],
      "link": "https://linkavto.ru/"
    },
    "awwwdde": {
      "title": "This site",
      "tagline": "The cobbler's children have shoes.",
      "desc": "My own portfolio — built with the same care I give every client project. Motion-heavy, minimal, honest.",
      "tags": ["GSAP", "Framer Motion", "Lenis"]
    },
    "abrikosova": {
      "title": "Elena Abrikosova",
      "tagline": "Sweet things deserve beautiful pages.",
      "desc": "Website for a pastry chef. Warm, soft, delicious — every scroll feels like unwrapping something special.",
      "tags": ["UI Design", "Development"],
      "link": "https://www.abrikosova-elena.ru/"
    }
  }
}
```

### `src/locales/ru.json`
```json
{
  "nav": {
    "work": "Работы",
    "about": "Обо мне",
    "contact": "Контакт"
  },
  "s0": {
    "line1": "Подумай о цвете",
    "pre": "Это",
    "clip": "Лаванда",
    "post": "правда?"
  },
  "s1": {
    "l1": "Когда будешь искать",
    "l2": "что-то настоящее —",
    "l3": "ты уже знаешь",
    "clip": "куда идти."
  },
  "s2": {
    "l1": "Я Creative Developer",
    "l2": "с",
    "rotating": ["вдумчивым", "точным", "минимальным", "честным"],
    "l3": "подходом."
  },
  "s3": {
    "title1": "Простой процесс.",
    "title2": "Реальный результат.",
    "step1_title": "Понимаю",
    "step1_desc": "Изучаю задачу, задаю нужные вопросы, нахожу что важно на самом деле.",
    "step2_title": "Строю",
    "step2_desc": "Дизайн и код параллельно. Быстрые итерации. Тесная обратная связь.",
    "step3_title": "Сдаю",
    "step3_desc": "В срок. Попиксельно. Готово к масштабированию."
  },
  "s4": {
    "title1": "Идеи бывают",
    "title2": "разной формы.",
    "cards": [
      { "title": "Frontend",  "body": "React. TypeScript.\nTailwind. Vite.\nПиксельная точность." },
      { "title": "Motion",    "body": "GSAP. Framer Motion.\nLenis. Скролл-магия.\nХореография UI." },
      { "title": "Дизайн",    "body": "Figma. UI-системы.\nInteraction design.\nЧистое мышление." },
      { "title": "Стратегия", "body": "Цифровое позиционирование.\nАрхитектура контента.\nЧестная коммуникация." }
    ]
  },
  "s5": {
    "title1": "Работы говорят",
    "title2": "сами за себя.",
    "cta": "Все работы →"
  },
  "s6": {
    "title1": "Есть проект?",
    "title2": "Давай поговорим.",
    "name": "Ваше имя",
    "email": "Ваш email",
    "budget": "Ваш бюджет",
    "submit": "Отправить →",
    "success": "Получил. Скоро напишу.",
    "or": "или напишите напрямую"
  },
  "footer": { "made": "Спроектировано и собрано awwwdde", "year": "2025" },
  "projects": {
    "pickupservice": {
      "title": "Pickup Service",
      "tagline": "Здесь начинается серьёзный внедорожник.",
      "desc": "Сайт-визитка для московского сервиса тюнинга внедорожников. Тёмный, жёсткий, механический.",
      "tags": ["UI Дизайн", "Разработка", "Брендинг"],
      "link": "https://pickupservice.moscow/"
    },
    "kitluna": {
      "title": "KitLuna",
      "tagline": "Студия, которая строит студии.",
      "desc": "Сайт для агентства веб-разработки. Чистая система, чёткая иерархия — заточено под конверсию.",
      "tags": ["UI Дизайн", "React", "Motion"]
    },
    "linkavto": {
      "title": "LinkAvto",
      "tagline": "Любая запчасть. Любой автомобиль.",
      "desc": "Маркетплейс автозапчастей. Сложный каталог, быстрый поиск, плавный UX по 50k+ позициям.",
      "tags": ["React", "TypeScript", "UX Дизайн"],
      "link": "https://linkavto.ru/"
    },
    "awwwdde": {
      "title": "Этот сайт",
      "tagline": "Сапожник с сапогами.",
      "desc": "Моё портфолио — собрано с той же заботой что и клиентские проекты. Motion, минимализм, честность.",
      "tags": ["GSAP", "Framer Motion", "Lenis"]
    },
    "abrikosova": {
      "title": "Елена Абрикосова",
      "tagline": "Сладкое заслуживает красивых страниц.",
      "desc": "Сайт для кондитера. Тёплый, мягкий, вкусный — каждый скролл как разворачивание подарка.",
      "tags": ["UI Дизайн", "Разработка"],
      "link": "https://www.abrikosova-elena.ru/"
    }
  }
}
```

---

## 6. CONTEXT

### `src/context/CursorContext.tsx`
```tsx
import { createContext, useContext, useState, ReactNode } from 'react'

export type CursorState = 'default' | 'pointer' | 'text' | 'view' | 'drag'

interface Ctx { state: CursorState; set: (s: CursorState) => void }
const C = createContext<Ctx>({ state: 'default', set: () => {} })

export function CursorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CursorState>('default')
  return <C.Provider value={{ state, set: setState }}>{children}</C.Provider>
}

export const useCursor = () => useContext(C)
```

### `src/context/SectionContext.tsx`
```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export const TOTAL = 7

interface Ctx {
  current: number
  prev: number
  dir: 1 | -1       // 1 = вниз, -1 = вверх
  going: boolean    // true = идёт переход, новые переходы блокируются
  goTo: (i: number) => void
}

const C = createContext<Ctx>({} as Ctx)

export function SectionProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [going, setGoing] = useState(false)

  // ЗАДЕРЖКА МЕЖДУ ПЕРЕКЛЮЧЕНИЯМИ — 900мс
  // Меньше нельзя — анимация текста (SPRING ~900мс) не успеет
  const LOCK_MS = 900

  const goTo = useCallback((i: number) => {
    if (going) return
    if (i < 0 || i >= TOTAL) return
    if (i === current) return

    setDir(i > current ? 1 : -1)
    setPrev(current)
    setCurrent(i)
    setGoing(true)
    setTimeout(() => setGoing(false), LOCK_MS)
  }, [current, going])

  return (
    <C.Provider value={{ current, prev, dir, going, goTo }}>
      {children}
    </C.Provider>
  )
}

export const useSectionCtx = () => useContext(C)
```

---

## 7. ХУКИ

### `src/hooks/useCursor.ts`
```ts
import { useEffect, RefObject } from 'react'
import gsap from 'gsap'

export function useCursorMove(ref: RefObject<HTMLDivElement>) {
  useEffect(() => {
    if (!ref.current) return
    // quickTo — единственный правильный способ двигать курсор через GSAP
    // Framer Motion здесь НЕ используется — слишком медленный
    const xTo = gsap.quickTo(ref.current, 'x', { duration: 0.12, ease: 'power3.out' })
    const yTo = gsap.quickTo(ref.current, 'y', { duration: 0.12, ease: 'power3.out' })
    const fn = (e: MouseEvent) => { xTo(e.clientX); yTo(e.clientY) }
    window.addEventListener('mousemove', fn)
    return () => window.removeEventListener('mousemove', fn)
  }, [])
}
```

### `src/hooks/useSectionScroll.ts`
```ts
// Этот хук перехватывает wheel/touch/keyboard на главной странице
// и переключает секции через SectionContext

import { useEffect } from 'react'
import { useSectionCtx, TOTAL } from '@/context/SectionContext'

export function useSectionScroll() {
  const { current, goTo, going } = useSectionCtx()

  useEffect(() => {
    // Вешаем класс на body — он включает overflow:hidden
    document.body.classList.add('home-page')
    return () => document.body.classList.remove('home-page')
  }, [])

  useEffect(() => {
    let lastWheel = 0
    const THROTTLE = 900 // мс — совпадает с LOCK_MS в контексте

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const now = Date.now()
      if (now - lastWheel < THROTTLE) return
      lastWheel = now
      if (e.deltaY > 30)  goTo(current + 1)
      if (e.deltaY < -30) goTo(current - 1)
    }

    let touchY = 0
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      const diff = touchY - e.changedTouches[0].clientY
      if (Math.abs(diff) < 60) return
      if (diff > 0) goTo(current + 1)
      else goTo(current - 1)
    }

    const onKey = (e: KeyboardEvent) => {
      if (['ArrowDown', 'PageDown'].includes(e.key)) goTo(current + 1)
      if (['ArrowUp', 'PageUp'].includes(e.key)) goTo(current - 1)
    }

    // passive: false — обязательно чтобы работал preventDefault
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [current, goTo])
}
```

### `src/hooks/useMagnetic.ts`
```ts
import { useRef } from 'react'
import { useSpring } from 'framer-motion'

export function useMagnetic(strength = 0.3) {
  const ref = useRef<HTMLElement>(null)
  const x = useSpring(0, { stiffness: 200, damping: 20, mass: 0.8 })
  const y = useSpring(0, { stiffness: 200, damping: 20, mass: 0.8 })

  const onMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    x.set((e.clientX - r.left - r.width / 2) * strength)
    y.set((e.clientY - r.top - r.height / 2) * strength)
  }

  const onLeave = () => { x.set(0); y.set(0) }

  return { ref, x, y, onMove, onLeave }
}
```

### `src/hooks/useSplitReveal.ts`
```ts
// ══════════════════════════════════════════════════════════════════
// ГЛАВНЫЙ ХУК АНИМАЦИИ ТЕКСТА — точно как на indaco.com
//
// КАК РАБОТАЕТ:
// 1. SplitType разбивает текст на строки (.split-line) и слова
// 2. CSS класс .split-line добавляет overflow:hidden на строку
// 3. Слова получают translateY(115%) — спрятаны за нижний край строки
// 4. GSAP анимирует слова до translateY(0) с spring easing и stagger
// 5. Эффект: каждое слово "выезжает снизу" как шторка — именно как у indaco
//
// ПОЧЕМУ ТАК А НЕ ИНАЧЕ:
// - overflow:hidden на строке = слово невидимо пока за краем
// - translateY(115%) а не opacity:0 = слово реально за краем, не прозрачное
// - spring easing = живое упругое движение, не механическое
// - stagger по словам = волна, не все сразу
// ══════════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import SplitType from 'split-type'

// SPRING EASING — точная копия с indaco.com
// НИКОГДА не заменяй на ease-in-out, cubic-bezier или другое
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
  trigger: boolean         // запустить анимацию
  delay?: number           // задержка перед стартом (сек)
  stagger?: number         // общее время stagger на все слова (сек)
  duration?: number        // длительность анимации одного слова (сек)
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

  // ШАГ 1: При монтировании — разбиваем текст и прячем слова
  useEffect(() => {
    const el = elRef.current
    if (!el) return

    split.current = new SplitType(el, {
      types: 'lines,words',
      lineClass:  'split-line',   // CSS .split-line { overflow:hidden }
      wordClass:  'split-word',
    })

    // Прячем каждое слово за нижний край своей строки
    gsap.set(split.current.words ?? [], {
      y: '115%',
      opacity: 0,
      willChange: 'transform, opacity',
    })

    return () => {
      tween.current?.kill()
      split.current?.revert()   // ОБЯЗАТЕЛЬНО — очищает DOM от span-ов
    }
  }, [splitBy])

  // ШАГ 2: Когда trigger становится true — запускаем анимацию
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
```

---

## 8. UI КОМПОНЕНТЫ

### `src/components/ui/TextReveal.tsx`
```tsx
// Умная обёртка над useSplitReveal
// На главной: trigger приходит снаружи (когда секция активна)
// На /work и /about: trigger через IntersectionObserver (при скролле)

import { useEffect, useRef, useState } from 'react'
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
  splitBy?: 'words'|'chars'
  // Для главной (fullscreen секции):
  // передай trigger={isActive} и autoTrigger={false}
  trigger?: boolean
  // Для /work и /about (обычный скролл):
  // оставь autoTrigger={true} — сработает при появлении в viewport
  autoTrigger?: boolean
  threshold?: number
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
  threshold = 0.15,
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
      <Tag ref={ref as any} className={clsx(className)}>
        {children}
      </Tag>
    </div>
  )
}
```

### `src/components/ui/ClipWord.tsx`
```tsx
// Лавандовая плашка с текстом — аналог синей плашки у indaco
// Используется внутри строки заголовка

import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface Props {
  children: ReactNode
  className?: string
  dark?: boolean  // true = тёмный текст на лавандовом (для светлых секций)
}

export function ClipWord({ children, className, dark = false }: Props) {
  return (
    <span className={clsx(
      'inline-block px-[0.18em] -mx-[0.08em] rounded-sm',
      'bg-lav',
      dark ? 'text-ink' : 'text-ink',
      className,
    )}>
      {children}
    </span>
  )
}
```

### `src/components/ui/WordRotator.tsx`
```tsx
// Ротация слов — используется в секции S2 About
// Слова меняются каждые 2 секунды с анимацией вылета/влёта

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  words: string[]
  interval?: number
  className?: string
}

export function WordRotator({ words, interval = 2000, className }: Props) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI(n => (n + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  return (
    <span className="inline-block overflow-hidden align-bottom relative" style={{ minWidth: '8ch' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[i]}
          className={`inline-block bg-lav px-[0.18em] rounded-sm text-ink ${className ?? ''}`}
          initial={{ y: '115%' }}
          animate={{ y: 0 }}
          exit={{ y: '-115%' }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
```

### `src/components/ui/MagneticButton.tsx`
```tsx
import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useMagnetic } from '@/hooks/useMagnetic'
import { useCursor } from '@/context/CursorContext'

interface Props {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'dark' | 'outline' | 'lav'
  className?: string
  type?: 'button' | 'submit'
}

const V = {
  dark:    'bg-ink text-white hover:bg-lav hover:text-ink',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-white',
  lav:     'bg-lav text-ink hover:bg-lav-dark',
}

export function MagneticButton({ children, href, onClick, variant = 'dark', className, type = 'button' }: Props) {
  const { ref, x, y, onMove, onLeave } = useMagnetic()
  const { set } = useCursor()
  const Tag = href ? 'a' : 'button'

  return (
    <motion.div style={{ x, y }} className="inline-block">
      <Tag
        ref={ref as any}
        href={href}
        onClick={onClick}
        type={Tag === 'button' ? type : undefined}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        onMouseEnter={() => set('pointer')}
        className={`
          inline-flex items-center px-6 py-3 rounded-full font-sans font-semibold
          text-[clamp(13px,0.9vw,16px)] transition-colors duration-300
          ${V[variant]} ${className ?? ''}
        `}
      >
        {children}
      </Tag>
    </motion.div>
  )
}
```

### `src/components/CustomCursor.tsx`
```tsx
import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useCursorMove } from '@/hooks/useCursor'
import { useCursor } from '@/context/CursorContext'

const VARIANTS = {
  default: { width: 12,  height: 12,  opacity: 0.8, borderRadius: '50%'   },
  pointer: { width: 40,  height: 40,  opacity: 0.4, borderRadius: '50%'   },
  text:    { width: 2,   height: 28,  opacity: 0.9, borderRadius: '2px'   },
  view:    { width: 72,  height: 72,  opacity: 0.85, borderRadius: '50%'  },
  drag:    { width: 56,  height: 56,  opacity: 0.35, borderRadius: '50%'  },
}

export function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null)
  useCursorMove(ref) // движение через GSAP — быстро
  const { state } = useCursor()

  return (
    <motion.div
      ref={ref}
      // Позиция через GSAP (x/y), форма через Framer Motion (animate)
      className="fixed top-0 left-0 bg-lav pointer-events-none z-[9999] mix-blend-multiply"
      style={{ translateX: '-50%', translateY: '-50%' }}
      animate={VARIANTS[state]}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
    />
  )
}
```

### `src/components/SectionDots.tsx`
```tsx
// Боковые точки — индикатор текущей секции
// Аналог бокового скроллера у indaco

import { motion } from 'framer-motion'
import { useSectionCtx, TOTAL } from '@/context/SectionContext'
import { useCursor } from '@/context/CursorContext'

export function SectionDots() {
  const { current, goTo } = useSectionCtx()
  const { set } = useCursor()

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5">
      {Array.from({ length: TOTAL }).map((_, i) => (
        <button
          key={i}
          onClick={() => goTo(i)}
          onMouseEnter={() => set('pointer')}
          onMouseLeave={() => set('default')}
          className="w-2 h-2 rounded-full transition-all duration-300 relative"
          style={{ background: current === i ? '#C4B5FD' : 'rgba(0,0,0,0.2)' }}
        >
          {current === i && (
            <motion.span
              layoutId="active-dot"
              className="absolute inset-0 rounded-full bg-lav"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </button>
      ))}
    </div>
  )
}
```

### `src/components/Header.tsx`
```tsx
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { MagneticButton } from './ui/MagneticButton'
import { LangSwitcher } from './LangSwitcher'
import { useCursor } from '@/context/CursorContext'

interface Props { lightMode?: boolean } // lightMode = белый текст на тёмном фоне

export function Header({ lightMode = false }: Props) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { set } = useCursor()
  const color = lightMode ? 'text-white' : 'text-ink'

  return (
    <header className={`fixed top-0 left-0 w-full z-50 px-10 py-8 flex items-center justify-between mix-blend-${lightMode ? 'screen' : 'multiply'}`}>
      <Link
        to="/"
        className={`font-mono text-[11px] uppercase tracking-widest ${color} opacity-60 hover:opacity-100 transition-opacity`}
        onMouseEnter={() => set('pointer')}
        onMouseLeave={() => set('default')}
      >
        awwwdde
      </Link>

      <nav className="hidden md:flex items-center gap-10">
        {[{ l: t('nav.work'), to: '/work' }, { l: t('nav.about'), to: '/about' }].map(({ l, to }) => (
          <Link
            key={to}
            to={to}
            className={`relative font-sans text-[clamp(13px,0.9vw,16px)] font-medium ${color} opacity-50 hover:opacity-100 transition-opacity`}
            onMouseEnter={() => set('pointer')}
            onMouseLeave={() => set('default')}
          >
            {l}
            {pathname === to && (
              <motion.span layoutId="nav-line" className="absolute -bottom-0.5 left-0 w-full h-px bg-current" />
            )}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <LangSwitcher lightMode={lightMode} />
        <MagneticButton href="/about#contact" variant={lightMode ? 'lav' : 'outline'}>
          {t('nav.contact')}
        </MagneticButton>
      </div>
    </header>
  )
}
```

### `src/components/LangSwitcher.tsx`
```tsx
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { useCursor } from '@/context/CursorContext'

export function LangSwitcher({ lightMode = false }: { lightMode?: boolean }) {
  const { i18n } = useTranslation()
  const { set } = useCursor()
  const lng = i18n.language

  return (
    <button
      onClick={() => i18n.changeLanguage(lng === 'en' ? 'ru' : 'en')}
      onMouseEnter={() => set('pointer')}
      onMouseLeave={() => set('default')}
      className={`font-mono text-[11px] uppercase tracking-widest w-8 h-5 overflow-hidden relative ${lightMode ? 'text-white/50 hover:text-white' : 'text-ink/40 hover:text-ink'} transition-colors`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={lng}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {lng.toUpperCase()}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
```

---

## 9. ГЛАВНАЯ СТРАНИЦА — FULLSCREEN СЛАЙДЫ

### `src/pages/Home.tsx`
```tsx
// Главная = 7 полноэкранных секций
// Каждая секция position:fixed, видна только активная
// Переключение через wheel/touch/keyboard

import { SectionProvider } from '@/context/SectionContext'
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

// Фоны секций — меняются при переключении
const SECTION_BG = [
  '#C4B5FD', // 0 Intro    — лавандовый
  '#ffffff', // 1 Trust    — белый
  '#EDE9FE', // 2 About    — светло-лавандовый
  '#ffffff', // 3 Method   — белый
  '#EDE9FE', // 4 Services — светло-лавандовый
  '#ffffff', // 5 Work     — белый
  '#0D0D0D', // 6 Contact  — почти чёрный
]

// Тёмный текст Header на секциях 0, 2, 4 (светлый фон лавандовый)
// Светлый Header на секции 6 (тёмный фон)
const HEADER_LIGHT = [false, false, false, false, false, false, true]

function HomeInner() {
  useSectionScroll() // перехватывает wheel/touch/keyboard
  const { current, dir } = useSectionCtx()

  return (
    // Фон всей страницы анимируется при смене секции
    <motion.div
      className="fixed inset-0 w-full h-dvh"
      animate={{ backgroundColor: SECTION_BG[current] }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Header lightMode={HEADER_LIGHT[current]} />

      {/* Секции — AnimatePresence показывает только активную */}
      {/* Остальные монтируются и демонтируются при переключении */}
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
    <SectionProvider>
      <HomeInner />
    </SectionProvider>
  )
}
```

---

## 10. СЕКЦИИ — КОД КАЖДОЙ

### БАЗОВЫЕ VARIANTS ДЛЯ АНИМАЦИИ СЕКЦИЙ
```tsx
// Копируй этот блок в каждую секцию
// dir: 1 = приходим снизу, -1 = приходим сверху

export const sectionVariants = {
  // Начальное состояние при появлении
  initial: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 60 : -60,
  }),
  // Активное состояние
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
  // Уход
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -60 : 60,
    transition: { duration: 0.35, ease: [0.4, 0, 1, 1] },
  }),
}
```

### `src/components/sections/S0Intro.tsx`
```tsx
// Секция 0: "Think of a Color / It's Lavender isn't it?"
// Фон: лавандовый #C4B5FD
// Текст: тёмный ink

import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import SplitType from 'split-type'

export function S0Intro() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()

  // Первая строка
  const ref1 = useSplitReveal({ trigger: true, delay: 0.1, stagger: 0.3 })
  // Вторая строка (pre + clip + post)
  const ref2 = useSplitReveal({ trigger: true, delay: 0.3, stagger: 0.35 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[60px] text-center"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      {/* "Think of a Color" */}
      <h1
        ref={ref1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(40px, 8vw, 130px)', lineHeight: 0.92 }}
      >
        {t('s0.line1')}
      </h1>

      {/* "It's [LAVENDER] isn't it?" — в одну строку */}
      {/* Слова в разных стилях через flex */}
      <div
        className="flex items-baseline gap-[0.2em] mt-2 flex-wrap justify-center"
        style={{ fontSize: 'clamp(40px, 8vw, 130px)', lineHeight: 0.92 }}
      >
        <AnimatedWord text={t('s0.pre')} delay={0.35} color="text-ink/60" />
        {/* Слово в рамке — белая плашка внутри лавандового фона */}
        <AnimatedClipWord text={t('s0.clip')} delay={0.45} />
        <AnimatedWord text={t('s0.post')} delay={0.55} color="text-ink/60" />
      </div>
    </motion.section>
  )
}

// Одно слово с анимацией выезда снизу
function AnimatedWord({ text, delay, color }: { text: string; delay: number; color: string }) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!ref.current) return
    gsap.fromTo(ref.current,
      { y: '115%', opacity: 0 },
      { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay }
    )
  }, [])

  return (
    <span className="overflow-hidden inline-block">
      <span ref={ref} className={`inline-block font-sans font-black ${color}`}>
        {text}
      </span>
    </span>
  )
}

// Слово в лавандовой плашке (белый/светлый фон с overflow hidden)
function AnimatedClipWord({ text, delay }: { text: string; delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const clipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!clipRef.current) return
    // Плашка появляется через clip-path слева направо
    gsap.fromTo(clipRef.current,
      { clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' },
      { clipPath: 'polygon(-30% 0, 130% 0, 130% 120%, -30% 120%)', duration: 0.7, ease: SPRING, delay }
    )
    // Текст внутри выезжает снизу
    if (ref.current) {
      gsap.fromTo(ref.current,
        { y: '115%', opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, ease: SPRING, delay: delay + 0.05 }
      )
    }
  }, [])

  return (
    <span
      ref={clipRef}
      className="inline-block bg-ink px-[0.18em] overflow-hidden rounded-sm"
      style={{ clipPath: 'polygon(-30% 0, 0% 0, 0% 120%, -30% 120%)' }}
    >
      <span ref={ref} className="inline-block font-sans font-black text-lav">
        {text}
      </span>
    </span>
  )
}
```

### `src/components/sections/S1Trust.tsx`
```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'

export function S1Trust() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()

  const r1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.18, stagger: 0.25 })
  const r3 = useSplitReveal({ trigger: true, delay: 0.31, stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-start justify-center px-[10vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h1
        ref={r1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(32px, 6vw, 96px)', lineHeight: 1.0 }}
      >
        {t('s1.l1')}
      </h1>
      <h1
        ref={r2 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(32px, 6vw, 96px)', lineHeight: 1.0 }}
      >
        {t('s1.l2')}
      </h1>
      <div
        className="flex items-baseline gap-[0.2em] mt-1 flex-wrap"
        style={{ fontSize: 'clamp(32px, 6vw, 96px)', lineHeight: 1.0 }}
      >
        <h1 ref={r3 as any} className="font-sans font-black text-ink inline">
          {t('s1.l3')}
        </h1>
        {/* Лавандовая плашка */}
        <span className="inline-block bg-lav px-[0.18em] font-sans font-black text-ink rounded-sm">
          {t('s1.clip')}
        </span>
      </div>
    </motion.section>
  )
}
```

### `src/components/sections/S2About.tsx`
```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { WordRotator } from '@/components/ui/WordRotator'
import { sectionVariants } from './sectionVariants'

export function S2About() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const words: string[] = t('s2.rotating', { returnObjects: true })

  const r1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.3 })
  const r2 = useSplitReveal({ trigger: true, delay: 0.25, stagger: 0.25 })
  const r3 = useSplitReveal({ trigger: true, delay: 0.4, stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[60px] text-center"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2
        ref={r1 as any}
        className="font-sans font-black text-ink"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}
      >
        {t('s2.l1')}
      </h2>

      {/* Строка с ротируемым словом */}
      <div
        className="flex items-baseline justify-center gap-[0.25em] flex-wrap"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}
      >
        <h2 ref={r2 as any} className="font-sans font-black text-ink inline">
          {t('s2.l2')}
        </h2>
        <WordRotator words={words} />
        <h2 ref={r3 as any} className="font-sans font-black text-ink inline">
          {t('s2.l3')}
        </h2>
      </div>

      {/* Подпись */}
      <p className="font-mono text-[11px] uppercase tracking-widest text-ink/40 mt-12">
        awwwdde — Creative Developer & Designer
      </p>
    </motion.section>
  )
}
```

### `src/components/sections/S3Method.tsx`
```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal, SPRING } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'

const STEPS_KEYS = ['step1', 'step2', 'step3']

export function S3Method() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[8vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      {/* Заголовки */}
      <h2
        ref={rT1 as any}
        className="font-sans font-black text-ink self-start"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s3.title1')}
      </h2>
      <h2
        ref={rT2 as any}
        className="font-sans font-black text-lav-dark self-start mb-[6vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}
      >
        {t('s3.title2')}
      </h2>

      {/* Timeline */}
      <div className="relative w-full flex justify-around items-center">
        {/* Горизонтальная линия */}
        <motion.div
          className="absolute top-1/2 h-px bg-lav-dark left-[80px]"
          initial={{ width: 0 }}
          animate={{ width: 'calc(100% - 160px)' }}
          transition={{ duration: 1.4, ease: SPRING, delay: 0.5 }}
          style={{ transform: 'translateY(-50%)' }}
        />

        {STEPS_KEYS.map((key, i) => (
          <div
            key={key}
            className={`relative z-10 flex flex-col items-center ${i === 1 ? 'flex-col-reverse' : ''}`}
          >
            {/* Описание */}
            <motion.p
              className="font-sans text-[clamp(12px,1vw,16px)] text-ink/60 max-w-[200px] text-center leading-relaxed mb-6"
              initial={{ opacity: 0, clipPath: 'polygon(0 0,0 0,0 100%,0 100%)' }}
              animate={{ opacity: 1, clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.25 }}
            >
              {t(`s3.${key}_desc`)}
            </motion.p>

            {/* Точка */}
            <motion.div
              className="w-9 h-9 rounded-full bg-lav border-[5px] border-white shadow-md"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.5 + i * 0.25, type: 'spring', stiffness: 350, damping: 22 }}
            />

            {/* Лейбл */}
            <motion.h3
              className="font-sans font-black text-ink mt-4"
              style={{ fontSize: 'clamp(20px, 2.5vw, 40px)' }}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.6 + i * 0.25 }}
            >
              {t(`s3.${key}_title`)}
            </motion.h3>
          </div>
        ))}
      </div>
    </motion.section>
  )
}
```

### `src/components/sections/S4Services.tsx`
```tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'

export function S4Services() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const cards: { title: string; body: string }[] = t('s4.cards', { returnObjects: true })
  const [hovered, setHovered] = useState<number | null>(null)

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  // Углы наклона карточек в idle состоянии
  const IDLE_ROTATES = [4, -4, 7, -8]
  const IDLE_Y = ['-4%', '10%', '-6%', '5%']

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[6vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2 ref={rT1 as any} className="font-sans font-black text-ink self-start"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s4.title1')}
      </h2>
      <h2 ref={rT2 as any} className="font-sans font-black text-lav-dark self-start mb-[4vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s4.title2')}
      </h2>

      <div
        className="grid grid-cols-4 gap-4 w-full"
        onMouseLeave={() => setHovered(null)}
      >
        {cards.map((card, i) => {
          const isHovered = hovered === i
          const anyHovered = hovered !== null

          return (
            <motion.div
              key={card.title}
              className="rounded-2xl bg-lav p-6 flex flex-col justify-between text-ink cursor-pointer"
              style={{ aspectRatio: '344/438' }}
              // Начальное появление — вылетает снизу
              initial={{ y: '100vh', rotate: -10, opacity: 0 }}
              animate={anyHovered
                ? isHovered
                  // Активная карточка — выпрямляется и масштабируется
                  ? { y: '-4%', rotate: 0, scale: 1.12, opacity: 1, zIndex: 10 }
                  // Остальные — уходят назад
                  : { y: IDLE_Y[i], rotate: IDLE_ROTATES[i] * 1.5, scale: 0.9, opacity: 0.65 }
                // Idle — все наклонены по-разному
                : { y: IDLE_Y[i], rotate: IDLE_ROTATES[i], scale: 1, opacity: 1 }
              }
              transition={{
                duration: anyHovered ? 0.4 : 0.7,
                ease: [0.16, 1, 0.3, 1],
                // Stagger при появлении
                delay: !anyHovered ? 0.2 + i * 0.15 : 0,
              }}
              onMouseEnter={() => setHovered(i)}
            >
              <h3 className="font-sans font-black text-[clamp(20px,2.2vw,32px)]">
                {card.title}
              </h3>
              <p className="font-sans text-[clamp(11px,0.9vw,15px)] text-ink/70 whitespace-pre-line leading-relaxed">
                {card.body}
              </p>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
```

### `src/components/sections/S5Work.tsx`
```tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { sectionVariants } from './sectionVariants'
import { useCursor } from '@/context/CursorContext'

const SLUGS = ['pickupservice', 'kitluna', 'linkavto', 'awwwdde', 'abrikosova']
const CARD_ROTATE = -12  // угол наклона карточек в idle

export function S5Work() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [hovered, setHovered] = useState<number | null>(null)

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[6vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2 ref={rT1 as any} className="font-sans font-black text-ink self-start"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s5.title1')}
      </h2>
      <h2 ref={rT2 as any} className="font-sans font-black text-lav-dark self-start mb-[3vh]"
        style={{ fontSize: 'clamp(28px, 4.5vw, 72px)', lineHeight: 1.05 }}>
        {t('s5.title2')}
      </h2>

      {/* Карточки проектов — перекрываются как у indaco */}
      <div
        className="relative w-full flex"
        style={{ height: '52vh' }}
        onMouseLeave={() => setHovered(null)}
      >
        {SLUGS.map((slug, i) => (
          <motion.div
            key={slug}
            className="absolute rounded-2xl overflow-hidden bg-surface"
            style={{
              // Карточки перекрываются — каждая занимает 185% ширины ячейки
              width: '185%',
              height: '100%',
              left: `${i * (100 / (SLUGS.length + 1))}%`,
              zIndex: hovered === i ? 10 : i,
            }}
            animate={
              hovered === null
                ? { rotate: CARD_ROTATE, scale: 0.72, y: 0 }
                : hovered === i
                  ? { rotate: 0, scale: 1, y: '-5%' }
                  : { rotate: CARD_ROTATE, scale: 0.62, y: '3%' }
            }
            transition={{ duration: hovered !== null ? 0.4 : 0.6, ease: [0.16, 1, 0.3, 1], delay: hovered === null ? i * 0.08 : 0 }}
            onMouseEnter={() => { setHovered(i); set('view') }}
            onMouseLeave={() => set('default')}
          >
            <Link to={`/work/${slug}`} className="block w-full h-full relative">
              {/* Заглушка — замени на img или video */}
              <div className="w-full h-full bg-lav-bg flex items-center justify-center">
                <span className="font-mono text-[11px] text-ink/40 uppercase tracking-widest">
                  {t(`projects.${slug}.title`)}
                </span>
              </div>

              {/* Hover overlay */}
              <motion.div
                className="absolute inset-0 bg-lav flex flex-col items-center justify-center gap-4 p-6"
                animate={{ opacity: hovered === i ? 1 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <p className="font-sans font-bold text-ink text-center text-[clamp(14px,1.2vw,20px)]">
                  {t(`projects.${slug}.title`)}
                </p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {(t(`projects.${slug}.tags`, { returnObjects: true }) as string[]).map(tag => (
                    <span key={tag} className="font-mono text-[10px] text-ink/60 uppercase tracking-widest">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}

        {/* Кнопка "See all" */}
        <motion.div
          className="absolute rounded-2xl bg-lav flex items-center justify-center"
          style={{
            width: '185%',
            height: '100%',
            left: `${SLUGS.length * (100 / (SLUGS.length + 1))}%`,
            zIndex: hovered === SLUGS.length ? 10 : 0,
          }}
          animate={
            hovered === SLUGS.length
              ? { rotate: 0, scale: 1.1, y: '-5%' }
              : { rotate: CARD_ROTATE, scale: 0.72 }
          }
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => { setHovered(SLUGS.length); set('pointer') }}
          onMouseLeave={() => set('default')}
        >
          <Link
            to="/work"
            className="font-sans font-black text-ink text-center"
            style={{ fontSize: 'clamp(16px, 2vw, 30px)' }}
          >
            {t('s5.cta')}
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}
```

### `src/components/sections/S6Contact.tsx`
```tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useSectionCtx } from '@/context/SectionContext'
import { useSplitReveal } from '@/hooks/useSplitReveal'
import { MagneticButton } from '@/components/ui/MagneticButton'
import { sectionVariants } from './sectionVariants'
import { useCursor } from '@/context/CursorContext'

export function S6Contact() {
  const { t } = useTranslation()
  const { dir } = useSectionCtx()
  const { set } = useCursor()
  const [sent, setSent] = useState(false)

  const rT1 = useSplitReveal({ trigger: true, delay: 0.05, stagger: 0.25 })
  const rT2 = useSplitReveal({ trigger: true, delay: 0.2,  stagger: 0.25 })

  const inp = `bg-white/10 rounded-xl px-5 py-4 text-white font-mono text-[13px]
    placeholder:text-white/40 placeholder:uppercase placeholder:tracking-widest
    outline-none w-full focus:bg-white/20 transition-colors border-none`

  return (
    <motion.section
      className="fixed inset-0 flex flex-col items-center justify-center px-[8vw]"
      variants={sectionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={dir}
    >
      <h2 ref={rT1 as any} className="font-sans font-black text-white self-start"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}>
        {t('s6.title1')}
      </h2>
      <h2 ref={rT2 as any} className="font-sans font-black text-lav self-start mb-[4vh]"
        style={{ fontSize: 'clamp(28px, 5vw, 80px)', lineHeight: 1.05 }}>
        {t('s6.title2')}
      </h2>

      <AnimatePresence mode="wait">
        {!sent ? (
          <motion.form
            key="form"
            className="w-full max-w-2xl flex flex-col gap-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scaleX: 0, transformOrigin: 'right' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
            onSubmit={(e) => { e.preventDefault(); setSent(true) }}
          >
            <div className="grid grid-cols-2 gap-4">
              <input className={inp} type="text" placeholder={t('s6.name')} required
                onMouseEnter={() => set('text')} onMouseLeave={() => set('default')} />
              <input className={inp} type="email" placeholder={t('s6.email')} required
                onMouseEnter={() => set('text')} onMouseLeave={() => set('default')} />
              <input className={`${inp} col-span-2`} type="text" placeholder={t('s6.budget')}
                onMouseEnter={() => set('text')} onMouseLeave={() => set('default')} />
            </div>
            <div className="flex items-center justify-between mt-2">
              <MagneticButton type="submit" variant="lav">{t('s6.submit')}</MagneticButton>
              <div className="text-right">
                <span className="font-mono text-[10px] text-white/30 uppercase tracking-widest block mb-1">
                  {t('s6.or')}
                </span>
                <a href="mailto:vlad@awwwdde.com"
                  className="font-sans font-semibold text-lav hover:text-white transition-colors text-[clamp(13px,1vw,16px)]"
                  onMouseEnter={() => set('pointer')} onMouseLeave={() => set('default')}>
                  vlad@awwwdde.com
                </a>
              </div>
            </div>
          </motion.form>
        ) : (
          <motion.p
            key="thanks"
            className="font-sans font-black text-lav"
            style={{ fontSize: 'clamp(24px, 3vw, 48px)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {t('s6.success')}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
```

### `src/components/sections/sectionVariants.ts`
```ts
// Этот файл импортируй в каждую секцию
export const sectionVariants = {
  initial: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? 70 : -70,
  }),
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir > 0 ? -70 : 70,
    transition: { duration: 0.32, ease: [0.4, 0, 1, 1] },
  }),
}
```

---

## 11. РОУТИНГ — `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CursorProvider } from '@/context/CursorContext'
import { CustomCursor } from '@/components/CustomCursor'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import Home from '@/pages/Home'
import Work from '@/pages/Work'
import ProjectDetail from '@/pages/ProjectDetail'
import About from '@/pages/About'
import './i18n'

// На /work и /about — Lenis обёртка + Header + Footer
// На / — Header и Footer внутри самой страницы (управляет SectionContext)
import { useEffect } from 'react'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLocation } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

function ScrollLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    if (isHome) return // на главной Lenis не нужен

    const lenis = new Lenis({
      duration: 1.3,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    return () => { lenis.destroy(); gsap.ticker.remove(tick) }
  }, [isHome])

  if (isHome) return <>{children}</>

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <CursorProvider>
      <BrowserRouter>
        <CustomCursor />
        <ScrollLayout>
          <Routes>
            <Route path="/"            element={<Home />} />
            <Route path="/work"        element={<Work />} />
            <Route path="/work/:slug"  element={<ProjectDetail />} />
            <Route path="/about"       element={<About />} />
          </Routes>
        </ScrollLayout>
      </BrowserRouter>
    </CursorProvider>
  )
}
```

---

## 12. `src/components/Footer.tsx`
```tsx
// На главной — рендерится внутри Home.tsx
// На /work и /about — рендерится через ScrollLayout в App.tsx
import { useTranslation } from 'react-i18next'
import { useCursor } from '@/context/CursorContext'

export function Footer({ light = false }: { light?: boolean }) {
  const { t } = useTranslation()
  const { set } = useCursor()
  const c = light ? 'text-white/30 hover:text-white' : 'text-ink/30 hover:text-ink'

  return (
    <footer className="fixed bottom-0 left-0 w-full z-40 px-10 py-6 flex items-center justify-between pointer-events-none">
      <span className={`font-mono text-[10px] uppercase tracking-widest pointer-events-auto ${c} transition-colors`}>
        {t('footer.made')} © {t('footer.year')}
      </span>
      <div className="flex gap-6 pointer-events-auto">
        {[
          { l: 'Instagram', u: 'https://instagram.com/awwwdde' },
          { l: 'Telegram',  u: 'https://t.me/awwwdde' },
          { l: 'GitHub',    u: 'https://github.com/awwwdde' },
        ].map(({ l, u }) => (
          <a key={l} href={u} target="_blank" rel="noreferrer"
            className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${c}`}
            onMouseEnter={() => set('pointer')} onMouseLeave={() => set('default')}>
            {l}
          </a>
        ))}
      </div>
    </footer>
  )
}
```

---

## 13. ФИНАЛЬНЫЙ ЧЕКЛИСТ

### Анимации текста — критично
- [ ] `src/index.css` содержит `.split-line { overflow: hidden !important; display: block !important; }`
- [ ] `useSplitReveal` использует точный SPRING easing из п.7 — не менять
- [ ] `useSplitReveal` вызывает `split.current.revert()` в cleanup — обязательно
- [ ] `trigger: true` передаётся в `useSplitReveal` только когда секция активна
- [ ] В каждой секции у каждой строки — отдельный вызов `useSplitReveal` с нарастающим delay

### Fullscreen механика — критично
- [ ] `body.home-page` имеет `overflow:hidden; height:100dvh` — нативный скролл отключён
- [ ] `useSectionScroll` вешает `{ passive: false }` на `wheel` событие
- [ ] Throttle в `useSectionScroll` и `LOCK_MS` в контексте — оба 900мс
- [ ] `AnimatePresence mode="wait"` в `Home.tsx` — секции не перекрываются
- [ ] `custom={dir}` передаётся в `motion.section` через variants
- [ ] На `/work` и `/about` Lenis активен, на `/` — нет

### Цвета — лаванда
- [ ] Акцент: `#C4B5FD` (lav)
- [ ] Hover акцент: `#A78BFA` (lav-dark)
- [ ] Светлый фон: `#EDE9FE` (lav-bg) — для секций 2 и 4
- [ ] Тёмный фон: `#0D0D0D` (ink) — секция 6 (Contact)
- [ ] Белый фон: `#FFFFFF` — секции 1, 3, 5

### Что НЕ делать
- [ ] НЕ двигать курсор через Framer Motion — только GSAP quickTo
- [ ] НЕ ставить `overflow:hidden` на `body` глобально — только через класс `.home-page`
- [ ] НЕ вызывать `SplitType` без сохранения ref для `.revert()`
- [ ] НЕ использовать `ease-in-out` вместо SPRING — весь эффект пропадёт
- [ ] НЕ использовать Inter, Roboto, Arial — только Onest и JetBrains Mono
