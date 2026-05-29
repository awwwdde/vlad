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
