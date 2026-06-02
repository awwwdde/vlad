import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { LangSwitcher } from '@/components/LangSwitcher'

// Палитра тянем из общего стиля, чтобы заглушка не выбивалась.
const ROTATING_RU = ['честно.', 'осознанно.', 'без воды.', 'скоро.']
const ROTATING_EN = ['honestly.', 'mindfully.', 'no fluff.', 'soon.']

const EASE = [0.16, 1, 0.3, 1] as const

/** Заглушка для публичного сайта пока он сырой.
 *  Включается переменной VITE_COMING_SOON=true в .env фронта.
 *  Bypass — через URL `?preview` (сохраняется в localStorage) или вход в админку. */
export default function ComingSoon() {
  const { i18n } = useTranslation()
  const isRu = i18n.language?.startsWith('ru')
  const list = isRu ? ROTATING_RU : ROTATING_EN
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIdx(i => (i + 1) % list.length)
    }, 1800)
    return () => window.clearInterval(id)
  }, [list.length])

  return (
    <div className="fixed inset-0 bg-lav-bg text-ink flex flex-col">
      {/* Хедер */}
      <header className="flex items-center justify-between px-6 md:px-10 py-6 md:py-8">
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink/60">
          awwwdde
        </span>
        <LangSwitcher />
      </header>

      {/* Центральная композиция */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-10 max-w-[1400px] mx-auto w-full">
        <motion.span
          className="font-mono text-[11px] uppercase tracking-widest text-ink/50 block mb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {isRu ? 'портфолио / в разработке' : 'portfolio / in progress'}
        </motion.span>

        <motion.h1
          className="font-sans font-black text-ink leading-[0.92] tracking-tight"
          style={{ fontSize: 'clamp(48px, 10vw, 180px)' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE, delay: 0.15 }}
        >
          {isRu ? 'Собираю' : 'Building'}
        </motion.h1>

        <motion.h1
          className="font-sans font-black text-lav-dark leading-[0.92] tracking-tight inline-flex items-baseline gap-3 flex-wrap"
          style={{ fontSize: 'clamp(48px, 10vw, 180px)' }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE, delay: 0.3 }}
        >
          <span>{isRu ? 'что-то' : 'something'}</span>
          {/* Ротатор-слово */}
          <span
            className="relative inline-block overflow-hidden align-baseline"
            style={{ height: '0.95em', minWidth: '5ch' }}
          >
            <motion.span
              key={idx}
              className="font-sans font-black text-ink absolute inset-0 flex items-baseline"
              initial={{ y: '105%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-105%', opacity: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
              style={{ lineHeight: 0.92 }}
            >
              {list[idx]}
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          className="font-sans text-ink/60 max-w-[60ch] mt-8 md:mt-12 leading-relaxed"
          style={{ fontSize: 'clamp(15px, 1.2vw, 19px)' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
        >
          {isRu
            ? 'Сайт сейчас перерабатывается. Если у вас проект — напишите, отвечу в течение суток.'
            : 'The site is being reworked. If you have a project — drop a line, I reply within a day.'}
        </motion.p>
      </main>

      {/* Футер */}
      <footer className="px-6 md:px-10 pb-6 md:pb-8 flex flex-wrap items-end justify-between gap-4 font-mono text-[11px] uppercase tracking-widest text-ink/55">
        <a
          href="mailto:Ohaww@yandex.ru"
          className="hover:text-ink transition-colors"
        >
          Ohaww@yandex.ru
        </a>
        <div className="flex items-center gap-1.5">
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-lav-dark"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span>{isRu ? 'в работе' : 'in progress'}</span>
        </div>
        <span>© 2026 awwwdde</span>
      </footer>
    </div>
  )
}
