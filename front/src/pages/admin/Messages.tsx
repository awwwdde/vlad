import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { ContactMessage } from '@/admin/types'

export default function Messages() {
  const [items, setItems] = useState<ContactMessage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [openId, setOpenId] = useState<number | null>(null)

  const reload = useCallback(() => {
    api<ContactMessage[]>('/api/messages', {
      query: filter === 'unread' ? { unread: true } : {},
    })
      .then(setItems)
      .catch(e => setError(e.message ?? String(e)))
  }, [filter])

  useEffect(() => {
    reload()
  }, [reload])

  // Открытие письма автоматически помечает как прочитанное.
  async function open(msg: ContactMessage) {
    setOpenId(openId === msg.id ? null : msg.id)
    if (!msg.is_read) {
      try {
        const updated = await api<ContactMessage>(`/api/messages/${msg.id}`, {
          method: 'PATCH',
          body: { is_read: true },
        })
        setItems(xs => (xs ?? []).map(x => (x.id === msg.id ? updated : x)))
        window.dispatchEvent(new CustomEvent('awwwdde-messages-refresh'))
      } catch {
        /* не критично — увидим в следующем reload */
      }
    }
  }

  async function toggleRead(msg: ContactMessage) {
    try {
      const updated = await api<ContactMessage>(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        body: { is_read: !msg.is_read },
      })
      setItems(xs => (xs ?? []).map(x => (x.id === msg.id ? updated : x)))
      window.dispatchEvent(new CustomEvent('awwwdde-messages-refresh'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    }
  }

  async function remove(msg: ContactMessage) {
    if (!window.confirm(`Удалить сообщение от ${msg.email}?`)) return
    try {
      await api(`/api/messages/${msg.id}`, { method: 'DELETE' })
      setItems(xs => (xs ?? []).filter(x => x.id !== msg.id))
      window.dispatchEvent(new CustomEvent('awwwdde-messages-refresh'))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e))
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Сообщения</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Заявки с форм на главной (S6Contact) и /about (A2Contact).
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-900 bg-neutral-950 p-1">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-xs transition ${
                filter === f
                  ? 'bg-neutral-100 text-neutral-950'
                  : 'text-neutral-400 hover:text-neutral-100'
              }`}
            >
              {f === 'all' ? 'Все' : 'Непрочитанные'}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-neutral-900 bg-neutral-950 divide-y divide-neutral-900 overflow-hidden">
        {items === null && (
          <div className="p-6 text-sm text-neutral-500">Загрузка…</div>
        )}
        {items?.length === 0 && (
          <div className="p-10 text-center text-neutral-500 text-sm">
            {filter === 'unread' ? 'Всё прочитано.' : 'Пока тишина.'}
          </div>
        )}
        {items?.map(m => (
          <div key={m.id}>
            <button
              onClick={() => open(m)}
              className={`w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-neutral-900/40 transition ${
                !m.is_read ? 'bg-neutral-900/30' : ''
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  m.is_read ? 'bg-neutral-700' : 'bg-emerald-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-sm truncate ${
                      m.is_read ? 'text-neutral-400' : 'text-neutral-100 font-medium'
                    }`}
                  >
                    {m.name || m.email}
                  </span>
                  {m.name && (
                    <span className="text-xs text-neutral-600 truncate">{m.email}</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 truncate mt-0.5">
                  {m.message?.slice(0, 100) || (m.budget ? `Бюджет: ${m.budget}` : '—')}
                </div>
              </div>
              <span className="text-[10px] text-neutral-600 font-mono uppercase tracking-wider flex-shrink-0">
                /{m.source}
              </span>
              <span className="text-xs text-neutral-500 flex-shrink-0 tabular-nums">
                {fmt(m.created_at)}
              </span>
            </button>

            <AnimatePresence initial={false}>
              {openId === m.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden border-t border-neutral-900 bg-neutral-950/40"
                >
                  <div className="px-5 py-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
                    <KV k="email">
                      <a
                        href={`mailto:${m.email}`}
                        className="text-neutral-100 hover:underline"
                      >
                        {m.email}
                      </a>
                    </KV>
                    {m.name && <KV k="имя">{m.name}</KV>}
                    {m.budget && <KV k="бюджет">{m.budget}</KV>}
                    {m.message && (
                      <KV k="сообщение">
                        <p className="whitespace-pre-wrap text-neutral-200">{m.message}</p>
                      </KV>
                    )}
                    <KV k="источник">{m.source}</KV>
                    {m.ip && <KV k="ip">{m.ip}</KV>}
                    {m.user_agent && (
                      <KV k="user-agent">
                        <span className="text-xs text-neutral-500 break-all">
                          {m.user_agent}
                        </span>
                      </KV>
                    )}
                    <KV k="когда">{new Date(m.created_at).toLocaleString('ru-RU')}</KV>
                  </div>
                  <div className="px-5 pb-4 flex items-center gap-2">
                    <button
                      onClick={() => toggleRead(m)}
                      className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800"
                    >
                      {m.is_read ? 'Пометить как непрочитанное' : 'Пометить как прочитанное'}
                    </button>
                    <div className="flex-1" />
                    <button
                      onClick={() => remove(m)}
                      className="rounded-md border border-red-900/50 px-3 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
                    >
                      Удалить
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  )
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <span className="text-xs uppercase tracking-wider text-neutral-500 pt-0.5">
        {k}
      </span>
      <span>{children}</span>
    </>
  )
}

function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}
