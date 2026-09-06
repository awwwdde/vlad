'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { LangSwitcher } from './LangSwitcher'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn'
import { HERO_EASE } from './hero/RevealText'

/**
 * Слои процедурного размытия под шапкой.
 *
 * Одним backdrop-filter такого не получить - он размывает равномерно. Слои
 * складываются стопкой: каждый следующий размывает сильнее, но его маска
 * обрывается выше предыдущей. Там, где перекрываются все, размытие
 * максимальное; ниже слои отваливаются один за другим, и оно сходит на нет
 * к нижней кромке шапки - шва между ней и страницей не возникает.
 *
 * Стили инлайновые не по лени: backdrop-filter из таблицы стилей вырезается
 * CSS-конвейером сборки и до браузера не доходит.
 */
const BLUR_LAYERS: Array<{ blur: number; stops: string }> = [
  { blur: 0.6, stops: '#000 0%, #000 100%' },
  { blur: 1.2, stops: '#000 0%, #000 55%, transparent 82%' },
  { blur: 2.4, stops: '#000 0%, #000 34%, transparent 62%' },
  { blur: 5, stops: '#000 0%, #000 18%, transparent 42%' },
  { blur: 10, stops: '#000 0%, transparent 24%' },
]

const NAV = [
  { href: '/about', label: 'me' },
  { href: '/work', label: 'work' },
]

/** Шапка проявляется первой и по частям: сначала знак, потом навигация,
 *  потом правый блок. Порядок совпадает с порядком чтения, а к моменту, когда
 *  начинает выходить заголовок героя, служебный слой уже стоит на месте. */
const CHROME_IN = [0.05, 0.12, 0.19]

export function SiteHeader() {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const reduce = useReducedMotion()

  // Меню хранит не булев флаг, а маршрут, на котором его открыли. Тогда
  // переход на другую страницу закрывает его сам собой, без эффекта,
  // синхронизирующего состояние с адресом.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname

  // На главной шапка лежит поверх сцены и остаётся прозрачной, пока герой в
  // кадре. Отслеживаем это IntersectionObserver-ом, а не обработчиком
  // скролла: он не будит основной поток на каждый кадр.
  const [heroVisible, setHeroVisible] = useState(true)
  const overHero = isHome && heroVisible

  useEffect(() => {
    if (!isHome) return
    const el = document.getElementById('hero')
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry.isIntersecting), {
      rootMargin: '-64px 0px 0px 0px',
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [isHome])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  // Цвет переключается классами, а не инлайн-стилем: инлайн перебивал классы и
  // менялся скачком. С классами свойство остаётся тем же, и transition-colors
  // доводит белый до тёмного плавно, синхронно с проявлением блюра.
  const FADE = 'transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'

  // Появление играется один раз за загрузку страницы: шапка живёт в общем
  // макете и при переходах между маршрутами не перемонтируется.
  const enter = (index: number) => ({
    initial: reduce ? false : { opacity: 0, y: -8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: CHROME_IN[index], ease: HERO_EASE },
  })

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40">
        {/* Шапка ничем не отделена от страницы: ни плашки, ни линии. Поверх
            героя под ней вообще ничего нет, дальше включается процедурный
            блюр - он размывает фон у верхней кромки и сходит на нет к нижнему
            краю шапки, поэтому шва между шапкой и контентом не возникает.
            Слой держится в разметке всегда и только меняет прозрачность:
            появление и уход получаются плавными. */}
        <div
          aria-hidden
          className={cn(
            'progressive-blur pointer-events-none absolute inset-x-0 top-0 h-24 transition-opacity duration-300',
            overHero ? 'opacity-0' : 'opacity-100',
          )}
        >
          {BLUR_LAYERS.map(layer => (
            <span
              key={layer.blur}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'block',
                backdropFilter: `blur(${layer.blur}px)`,
                WebkitBackdropFilter: `blur(${layer.blur}px)`,
                maskImage: `linear-gradient(to bottom, ${layer.stops})`,
                WebkitMaskImage: `linear-gradient(to bottom, ${layer.stops})`,
              }}
            />
          ))}
        </div>

        <div className="relative mx-auto grid h-16 w-full max-w-[1920px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 font-ui md:px-[100px]">
          <motion.div className="justify-self-start" {...enter(0)}>
            <Link
              href="/"
              aria-label="awwwdde"
              className={cn('block', FADE, overHero ? 'text-white' : 'text-fg')}
            >
              <Logo className="h-5" />
            </Link>
          </motion.div>

          <motion.nav
            className="hidden items-center gap-7 justify-self-center md:flex"
            {...enter(1)}
          >
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'text-[15px] font-medium tracking-tight',
                  FADE,
                  overHero
                    ? isActive(item.href)
                      ? 'text-white'
                      : 'text-white/65 hover:text-white'
                    : isActive(item.href)
                      ? 'text-fg'
                      : 'text-muted hover:text-fg',
                )}
              >
                {item.label}
              </Link>
            ))}
          </motion.nav>

          <motion.div className="flex items-center gap-2 justify-self-end md:gap-4" {...enter(2)}>
            <LangSwitcher className="hidden sm:flex" onDark={overHero} />

            {/* Белая кнопка работает и поверх зелёного кадра, и на светлых
                страницах: тонкая рамка не даёт ей раствориться в фоне. */}
            <Link
              href="/contact"
              className="hidden rounded-full border border-black/[0.08] bg-white px-5 py-2.5 text-[14px] font-medium leading-none tracking-tight text-[#17210c] shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-[background-color,transform] duration-150 hover:bg-white active:translate-y-px md:inline-flex"
            >
              create
            </Link>

            <button
              type="button"
              onClick={() => setOpenOn(open ? null : pathname)}
              aria-label="menu"
              aria-expanded={open}
              className={cn(
                '-mr-2 flex h-10 w-10 items-center justify-center md:hidden',
                FADE,
                overHero ? 'text-white' : 'text-fg',
              )}
            >
              {open ? <X size={20} /> : <List size={20} />}
            </button>
          </motion.div>
        </div>

        {open && (
          <nav className="relative bg-bg md:hidden">
            <div className="mx-auto flex w-full max-w-[1920px] flex-col px-5 py-2">
              {NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'py-3 text-[17px]',
                    isActive(item.href) ? 'text-fg' : 'text-muted',
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/contact" className="py-3 text-[17px] text-accent">
                create
              </Link>
              <div className="py-3">
                <LangSwitcher />
              </div>
            </div>
          </nav>
        )}
      </header>
    </>
  )
}
