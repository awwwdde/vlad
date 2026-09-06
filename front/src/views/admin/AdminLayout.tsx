'use client'

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn'
import { useAuth } from '@/admin/AuthContext'
import { api } from '@/admin/api'

// Пути относительно basename='/admin' — префикс подставляет роутер.
const NAV = [
  { to: '/', label: 'Дашборд', end: true },
  { to: '/projects', label: 'Под-сайты' },
  { to: '/portfolio', label: 'Портфолио' },
  { to: '/content', label: 'Контент' },
  { to: '/messages', label: 'Сообщения', badgeKey: 'unread' as const },
] as const

export default function AdminLayout() {
  const { user, logout } = useAuth()
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
    <div className="admin-root min-h-screen bg-bg text-fg">
      {/* Боковая колонка на волосяной линии вместо плашки: панель набрана теми
          же средствами, что и сайт, и «коробок» на нём нет нигде. */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-line bg-bg px-6 py-7">
        <Link to="/" className="text-fg" aria-label="awwwdde">
          <Logo className="h-6" />
        </Link>
        <div className="mt-1.5 font-ui text-[12px] text-muted">панель управления</div>

        <nav className="mt-9 flex flex-1 flex-col">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between border-t border-line py-3 font-ui text-[14px] transition-colors duration-200',
                  isActive ? 'text-fg' : 'text-muted hover:text-fg',
                )
              }
            >
              <span>{item.label}</span>
              {'badgeKey' in item && item.badgeKey === 'unread' && unread > 0 && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-ui text-[11px] tabular-nums text-accent">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 border-t border-line pt-5">
          <div className="truncate font-ui text-[12px] text-muted">{user?.email}</div>
          <button
            onClick={logout}
            className="self-start font-ui text-[13px] text-muted transition-colors duration-200 hover:text-fg"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="pl-60">
        <div className="mx-auto max-w-[1400px] px-10 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
