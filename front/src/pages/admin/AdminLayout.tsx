import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/admin/AuthContext'
import { api } from '@/admin/api'

const NAV = [
  { to: '/admin', label: 'Дашборд', end: true },
  { to: '/admin/projects', label: 'Под-сайты' },
  { to: '/admin/portfolio', label: 'Портфолио' },
  { to: '/admin/content', label: 'Контент' },
  { to: '/admin/messages', label: 'Сообщения', badgeKey: 'unread' as const },
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
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="fixed inset-y-0 left-0 w-60 border-r border-neutral-900 bg-neutral-950 p-5 flex flex-col">
        <div className="mb-8">
          <div className="text-lg font-semibold tracking-tight">awwwdde</div>
          <div className="text-xs text-neutral-500">панель управления</div>
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={({ isActive }) =>
                `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-neutral-900 text-neutral-100'
                    : 'text-neutral-400 hover:bg-neutral-900/60 hover:text-neutral-100'
                }`
              }
            >
              <span>{item.label}</span>
              {'badgeKey' in item && item.badgeKey === 'unread' && unread > 0 && (
                <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-mono">
                  {unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 space-y-2 border-t border-neutral-900 pt-4 text-xs">
          <div className="text-neutral-500 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="text-neutral-400 hover:text-neutral-100 transition"
          >
            Выйти
          </button>
        </div>
      </aside>

      <main className="pl-60">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
