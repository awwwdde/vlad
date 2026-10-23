'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Menu } from '@base-ui/react/menu'
import { Popover } from '@base-ui/react/popover'
import { CaretDown, List, X } from '@phosphor-icons/react'
import type { PortfolioItem } from '@/admin/types'
import { usePortfolio } from '@/hooks/usePortfolio'
import { LangSwitcher } from './LangSwitcher'
import { Logo } from './Logo'

const navLink = "group/nav inline-flex min-h-11 cursor-pointer items-center gap-1.5 whitespace-nowrap border-0 bg-transparent text-[18px] font-medium tracking-[-.035em] text-inherit aria-[current=page]:underline aria-[current=page]:underline-offset-[6px] max-[1100px]:text-base [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-80"
const menuLink = "flex min-h-10 cursor-pointer items-center rounded-[9px] px-3 py-[9px] text-[18px] font-medium leading-[1.25] tracking-[-.03em] outline-none [overflow-wrap:anywhere] aria-[current=page]:bg-[rgb(150_170_180_/_22%)] data-[highlighted]:bg-[rgb(150_170_180_/_22%)] focus-visible:bg-[rgb(150_170_180_/_22%)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-2px] focus-visible:outline-current [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[rgb(150_170_180_/_20%)]"
const glass = "outline-none focus:outline-none focus-visible:outline-none w-[260px] max-w-[calc(100vw-32px)] max-h-[min(440px,var(--available-height))] overflow-y-auto rounded-2xl border border-fg/[.14] bg-bg/[.83] p-[7px] font-ui text-fg shadow-[inset_0_1px_0_rgb(255_255_255_/_16%),0_12px_36px_rgb(12_31_43_/_16%)] backdrop-blur-[24px] backdrop-saturate-[125%] origin-[var(--transform-origin)] transition-[opacity,transform] duration-[180ms] ease-[cubic-bezier(.16,1,.3,1)] data-[tone=sky]:border-[rgb(228_238_238_/_32%)] data-[tone=sky]:bg-[rgb(133_157_166_/_24%)] data-[tone=sky]:text-[#f8f7f3] data-[starting-style]:opacity-0 data-[starting-style]:scale-[.96] data-[ending-style]:opacity-0 data-[ending-style]:scale-[.96] data-[instant]:transition-none motion-reduce:transition-none motion-reduce:data-[starting-style]:scale-100 motion-reduce:data-[ending-style]:scale-100 [@media(prefers-reduced-transparency:reduce)]:data-[tone=sky]:bg-[#536d79] [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"

export function SiteHeader({ initialItems }: { initialItems?: PortfolioItem[] }) {
  const pathname = usePathname()
  const { t, i18n } = useTranslation()
  const isHome = pathname === '/' || pathname === '/contact'
  const [darkVisible, setDarkVisible] = useState(isHome)
  const [instant, setInstant] = useState(false)
  const overHero = darkVisible
  const items = usePortfolio(initialItems)
  const lang = i18n.language.startsWith('en') ? 'en' : 'ru'
  const links = [
    { href: '/work', title: t('nav.all_projects') },
    ...items.map(item => ({ href: `/work/${item.slug}`, title: (item[lang].title ? item[lang] : item[lang === 'ru' ? 'en' : 'ru']).title })),
  ]

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const edge = document.querySelector('header')?.getBoundingClientRect().bottom ?? 85
      const hero = isHome ? document.getElementById('hero')?.getBoundingClientRect() : null
      const overDark = Array.from(document.querySelectorAll('[data-header-dark]')).some(section => { const bounds = section.getBoundingClientRect(); return bounds.top < edge && bounds.bottom > edge })
      setDarkVisible(Boolean(hero && hero.top < edge && hero.bottom > edge) || overDark)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [isHome, pathname])

  const current = (href: string) => pathname === href ? 'page' as const : undefined

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-[5.2%] pb-3 pt-6 font-ui text-fg transition-colors duration-[180ms] data-[tone=sky]:text-[#f8f7f3] max-[860px]:pt-[18px] motion-reduce:transition-none [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-current [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-current" data-tone={overHero ? 'sky' : 'page'}>
      <div className="mx-auto grid min-h-[46px] max-w-[1680px] grid-cols-[1fr_auto_1fr] items-center gap-[26px] max-[1100px]:gap-[18px] max-[860px]:grid-cols-[1fr_auto] max-[860px]:gap-3">
        <Link href="/" className="inline-flex items-center justify-self-start" aria-label="awwwdde"><Logo className="h-[22px] max-[860px]:h-5" /></Link>
        <nav className="flex items-center gap-[clamp(20px,2.8vw,44px)] max-[1100px]:gap-5 max-[860px]:hidden" aria-label={t('nav.main')}>
          <Menu.Root key={pathname} modal={false} onOpenChange={(_, details) => setInstant(details.event.type.startsWith('key'))}>
            <Menu.Trigger className={navLink} data-instant={instant || undefined} openOnHover delay={120} closeDelay={180}>
              {t('nav.projects')} <CaretDown size={13} className="transition-transform duration-[180ms] ease-[cubic-bezier(.16,1,.3,1)] group-data-[popup-open]/nav:rotate-180 group-data-[instant]/nav:transition-none motion-reduce:transition-none" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={10} align="start" className="z-[60] outline-none">
                <Menu.Popup className={glass} data-instant={instant || undefined} data-tone={overHero ? 'sky' : 'page'} aria-label={t('nav.projects')}>
                  {links.map(link => (
                    <Menu.Item key={link.href} render={<Link href={link.href} />} className={menuLink} aria-current={current(link.href)}>
                      {link.title}
                    </Menu.Item>
                  ))}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <Link href="/about" className={navLink} aria-current={current('/about')}>{t('nav.about')}</Link>
          <Link href="/contact" className={navLink} aria-current={current('/contact')}>{t('nav.contacts')}</Link>
        </nav>
        <div className="flex items-center justify-self-end gap-[22px] max-[1100px]:gap-3">
          <LangSwitcher className="max-[420px]:hidden" onDark={overHero} separator />
          <Link href="/contact" className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-full border border-[rgb(26_38_44_/_7%)] bg-[#f8f7f3] px-5 py-2.5 text-[17px] font-medium tracking-[-.04em] text-[#17232a] transition-colors duration-150 max-[1100px]:px-[15px] max-[1100px]:text-[15px] max-[860px]:hidden [@media(hover:hover)_and_(pointer:fine)]:hover:bg-[#e8ece9] motion-reduce:transition-none">{t('common.cta_contact')}</Link>
          <MobileNavigation key={pathname} links={links} overHero={overHero} pathname={pathname} />
        </div>
      </div>
    </header>
  )
}

function MobileNavigation({ links, overHero, pathname }: {
  links: { href: string; title: string }[]
  overHero: boolean
  pathname: string
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [instant, setInstant] = useState(false)
  useEffect(() => {
    const query = matchMedia('(min-width: 861px)')
    const closeOnDesktop = () => { if (query.matches) setOpen(false) }
    query.addEventListener('change', closeOnDesktop)
    return () => query.removeEventListener('change', closeOnDesktop)
  }, [])

  return (
    <Popover.Root open={open} onOpenChange={(next, details) => {
      setInstant(details.event.type.startsWith('key'))
      setOpen(next)
    }}>
      <Popover.Trigger className="group/mobile hidden size-11 items-center justify-center rounded-full text-inherit max-[860px]:inline-flex" aria-label={t(open ? 'nav.close_menu' : 'nav.menu')}>
        <List size={23} className="group-data-[popup-open]/mobile:hidden" aria-hidden="true" />
        <X size={23} className="hidden group-data-[popup-open]/mobile:block" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} align="end" className="z-[60] outline-none">
          <Popover.Popup className={`${glass} !w-[300px] !max-h-[min(70svh,var(--available-height))] [&_a]:min-h-11`} data-instant={instant || undefined} data-tone={overHero ? 'sky' : 'page'}>
            <Popover.Title className="sr-only">{t('nav.main')}</Popover.Title>
            <nav aria-label={t('nav.main')}>
              {links.map(link => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={menuLink} aria-current={pathname === link.href ? 'page' : undefined}>{link.title}</Link>
              ))}
              <div className="mx-2.5 my-1.5 h-px bg-current opacity-[.16]" />
              <Link href="/about" onClick={() => setOpen(false)} className={menuLink}>{t('nav.about')}</Link>
              <Link href="/contact" onClick={() => setOpen(false)} className={menuLink}>{t('nav.contacts')}</Link>
            </nav>
            <div className="px-1 pb-0.5 pt-2"><LangSwitcher onDark={overHero} separator /></div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}
