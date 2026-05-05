import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { LangSwitcher } from './LangSwitcher'
import { useCursor } from '@/context/CursorContext'

interface Props { lightMode?: boolean }

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

      <div className="flex items-center gap-8">
        <nav className="hidden md:flex items-center gap-8">
        {[
          { l: t('nav.work'), to: '/work' },
          { l: t('nav.about'), to: '/about' }
        ].map(({ l, to }) => (
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
      </div>
    </header>
  )
}
