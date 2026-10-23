'use client'

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn'
import { useAuth } from '@/admin/AuthContext'
import { api } from '@/admin/api'
import { PORTFOLIO_THEME } from '@/lib/siteTheme'
import { ArrowUpRight, Article, EnvelopeSimple, GearSix, Globe, SquaresFour, Stack } from '@phosphor-icons/react'

// Пути относительно basename='/admin' — префикс подставляет роутер.
const NAV = [
  { to: '/', label: 'Обзор', icon: SquaresFour, end: true },
  { to: '/projects', label: 'Подсайты', icon: Globe },
  { to: '/portfolio', label: 'Портфолио', icon: Stack },
  { to: '/content', label: 'Тексты сайта', icon: Article },
  { to: '/settings', label: 'Настройки сайта', icon: GearSix },
  { to: '/messages', label: 'Сообщения', icon: EnvelopeSimple, badgeKey: 'unread' as const },
] as const

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [unread, setUnread] = useState<number>(0)

  // Поллим счётчик непрочитанных раз в 30 секунд + слушаем кастомный ивент
  // от Messages.tsx (мгновенное обновление, когда юзер сам прочитал/удалил).
  useEffect(() => {
    let cancelled = false
    const refresh = () =>
      api<{ count: number }>('/api/messages/unread/count')
        .then(r => {
          if (!cancelled) setUnread(r.count)
        })
        .catch(() => {
          /* не критично */
        })
    refresh()
    const id = window.setInterval(refresh, 30_000)
    const onCustom = () => refresh()
    window.addEventListener('awwwdde-messages-refresh', onCustom)
    return () => {
      cancelled = true
      window.clearInterval(id)
      window.removeEventListener('awwwdde-messages-refresh', onCustom)
    }
  }, [])

  return (
    <div className={`admin-root min-h-screen ${PORTFOLIO_THEME}`}>
      {/* Боковая колонка на волосяной линии вместо плашки: панель набрана теми
          же средствами, что и сайт, и «коробок» на нём нет нигде. */}
      <aside className="relative z-20 flex flex-col bg-[#293f4a] px-5 py-5 text-[#f5f5ee] lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:px-7 lg:py-9">
        <div className="flex items-center justify-between gap-4 lg:block"><Link to="/" className="inline-block text-[#f5f5ee]" aria-label="awwwdde"><Logo className="h-7" /></Link><span className="font-mono text-xs text-[#d5bf99] lg:mt-5 lg:block">[ control room ]</span></div>

        <nav aria-label="Разделы панели" className="-mx-2 mt-6 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mt-12 lg:flex-1 lg:flex-col lg:overflow-visible">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-xl px-3 py-3 font-ui text-[15px] transition-colors duration-150',
                  isActive ? 'bg-white/10 text-white' : 'text-[#b8c7cc] hover:bg-white/5 hover:text-white',
                )
              }
            >
              <span className="flex items-center gap-3"><item.icon size={19} aria-hidden />{item.label}</span>
              {'badgeKey' in item && item.badgeKey === 'unread' && unread > 0 && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-ui text-[11px] tabular-nums text-accent">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-7 hidden flex-col gap-2 border-t border-white/15 pt-5 lg:flex">
          <a href="/" target="_blank" rel="noopener noreferrer" className="mb-4 flex items-center justify-between text-sm text-[#e0cba7]">Открыть сайт<ArrowUpRight size={17} aria-hidden /></a>
          <div className="truncate font-ui text-[13px] text-[#b8c7cc]">{user?.email}</div>
          <button
            onClick={logout}
            className="min-h-11 self-start font-ui text-sm text-[#b8c7cc] transition-colors duration-150 hover:text-white"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="min-w-0 lg:pl-64">
        <div className="flex min-h-16 items-center justify-between gap-4 border-b border-line px-[6%] text-sm text-muted"><span>awwwdde <span className="mx-2 text-fg/25">/</span>{NAV.find(item => item.to === location.pathname)?.label ?? 'Панель'}</span><div className="flex items-center gap-4"><a href="/" target="_blank" rel="noopener noreferrer" className="lg:hidden">Сайт ↗</a><button type="button" onClick={logout} className="min-h-11 lg:hidden">Выйти</button><span className="hidden font-mono text-xs sm:block">{user?.email}</span></div></div>
        <div className="mx-auto max-w-[1600px] px-[6%] py-10 lg:py-14">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
