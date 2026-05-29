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
