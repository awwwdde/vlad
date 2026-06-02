import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { LangSwitcher } from './LangSwitcher'
import { useCursor } from '@/context/CursorContext'

interface Props {
  lightMode?: boolean
}

const EASE = [0.16, 1, 0.3, 1] as const

export function Header({ lightMode = false }: Props) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { set } = useCursor()
  const [menuOpen, setMenuOpen] = useState(false)

  const color = lightMode ? 'text-white' : 'text-ink'

  // При смене страницы — автоматически закрываем меню.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  // Блокируем скролл публички, пока меню открыто (главная — fixed, остальное —
  // через body overflow).
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const navItems = [
    { l: t('nav.work'), to: '/work' },
    { l: t('nav.about'), to: '/about' },
  ]

  return (
    <>
      <header className={`fixed top-0 left-0 w-full z-50 px-6 md:px-10 py-6 md:py-8 flex items-center justify-between mix-blend-${lightMode ? 'screen' : 'multiply'}`}>
        <Link
          to="/"
          className={`font-mono text-[11px] uppercase tracking-widest ${color} opacity-60 hover:opacity-100 transition-opacity`}
          onMouseEnter={() => set('pointer')}
          onMouseLeave={() => set('default')}
        >
          awwwdde
        </Link>

        <div className="flex items-center gap-6 md:gap-8">
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map(({ l, to }) => (
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

          <LangSwitcher lightMode={lightMode} />

          {/* Burger — только на mobile */}
          <button
            aria-label="menu"
            onClick={() => setMenuOpen(true)}
            className={`md:hidden relative w-6 h-6 flex flex-col items-center justify-center gap-1.5 ${color}`}
          >
            <span className="block w-6 h-px bg-current" />
            <span className="block w-6 h-px bg-current" />
          </button>
        </div>
      </header>

      {/* Mobile fullscreen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="fixed inset-0 z-[60] bg-ink text-white flex flex-col md:hidden"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Header в меню (логотип + close) */}
            <div className="flex items-center justify-between px-6 py-6">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="font-mono text-[11px] uppercase tracking-widest text-white/60"
              >
                awwwdde
              </Link>
              <button
                aria-label="close"
                onClick={() => setMenuOpen(false)}
                className="relative w-8 h-8 flex items-center justify-center"
              >
                <span className="absolute w-7 h-px bg-white rotate-45" />
                <span className="absolute w-7 h-px bg-white -rotate-45" />
              </button>
            </div>

            {/* Большие пункты по центру */}
            <nav className="flex-1 flex flex-col justify-center px-6 gap-6">
              {navItems.map(({ l, to }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.05 + i * 0.08 }}
                >
                  <Link
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="font-sans font-black text-white block leading-none"
                    style={{ fontSize: 'clamp(48px, 14vw, 92px)' }}
                  >
                    {l}
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Низ: lang + email */}
            <div className="px-6 pb-8 flex items-center justify-between text-white/50 font-mono text-[11px] uppercase tracking-widest">
              <a href="mailto:vlad@awwwdde.com" className="hover:text-white transition-colors">
                vlad@awwwdde.com
              </a>
              <LangSwitcher lightMode />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
