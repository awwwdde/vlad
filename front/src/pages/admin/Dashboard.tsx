import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/admin/api'
import type { Project } from '@/admin/types'
import { STATUS_META } from './projectStatus'

// Тоже самое имя канала и того же ключа, что и в front public (useSiteSettings).
// При тоггле — оповещаем все вкладки (включая публику) перечитать настройки.
const SITE_CHANNEL =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('awwwdde.site')
    : null

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Project[]>('/api/projects')
      .then(setProjects)
      .catch(e => setError(String(e.message ?? e)))
  }, [])

  const counts = (projects ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Дашборд</h1>
        <p className="text-sm text-neutral-500 mt-1">Общее состояние под-сайтов.</p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <ComingSoonToggle />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div
            key={key}
            className="rounded-xl border border-neutral-900 bg-neutral-950 p-4"
          >
            <div className={`text-xs uppercase tracking-wider ${meta.dim}`}>
              {meta.label}
            </div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">
              {counts[key] ?? 0}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-neutral-900 bg-neutral-950">
        <div className="flex items-center justify-between p-4 border-b border-neutral-900">
          <h2 className="text-sm font-medium">Последние</h2>
          <Link to="/admin/projects" className="text-xs text-neutral-400 hover:text-neutral-100">
            все →
          </Link>
        </div>
        <ul className="divide-y divide-neutral-900">
          {(projects ?? []).slice(0, 5).map(p => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">{p.slug}</div>
                <div className="text-xs text-neutral-500">{p.domain}</div>
              </div>
              <span className={`text-xs ${STATUS_META[p.status].text}`}>
                {STATUS_META[p.status].label}
              </span>
            </li>
          ))}
          {projects && projects.length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-500 text-center">
              Ещё нет ни одного проекта
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ── Тоггл «Режим тестов» ───────────────────────────────────────────────────

function ComingSoonToggle() {
  // null = ещё не загрузили; true/false — текущее состояние
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    api<Record<string, string>>('/api/site/settings')
      .then(s => setEnabled(s.coming_soon === 'true'))
      .catch(e => setError(e instanceof ApiError ? e.message : String(e)))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  async function toggle() {
    if (enabled === null) return
    const next = !enabled
    setBusy(true)
    setError(null)
    // Оптимистично переключаем UI — отыграем назад если PUT упадёт.
    setEnabled(next)
    try {
      await api(`/api/site/settings/coming_soon`, {
        method: 'PUT',
        body: { value: next ? 'true' : 'false' },
      })
      // Оповещаем все открытые вкладки публички — они мгновенно
      // перерисуются в ComingSoon (или обратно).
      SITE_CHANNEL?.postMessage({ type: 'invalidate' })
    } catch (e) {
      setEnabled(!next)
      setError(e instanceof ApiError ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const isLoading = enabled === null

  return (
    <motion.div
      layout
      className={`rounded-xl border p-5 flex items-center gap-5 ${
        enabled
          ? 'border-amber-700/50 bg-amber-950/20'
          : 'border-neutral-900 bg-neutral-950'
      }`}
    >
      {/* Статус-индикатор */}
      <div className="flex-shrink-0">
        <motion.div
          animate={enabled ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] } : {}}
          transition={enabled ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : {}}
          className={`w-3 h-3 rounded-full ${
            enabled ? 'bg-amber-400' : 'bg-emerald-500'
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h2 className="text-sm font-medium text-neutral-100">
          {isLoading
            ? 'Загрузка статуса…'
            : enabled
              ? 'Сайт скрыт: режим тестов'
              : 'Сайт открыт для всех'}
        </h2>
        <p className="text-xs text-neutral-500 mt-1 max-w-xl">
          {enabled
            ? 'Обычные посетители видят заглушку ComingSoon. Ты, как админ, и любой по ссылке ?preview — видят полный сайт.'
            : 'Главная и страницы Work/About доступны любому посетителю. Включи режим тестов, если хочешь полировать в тишине.'}
        </p>
      </div>

      <button
        onClick={toggle}
        disabled={busy || isLoading}
        className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
          enabled
            ? 'bg-emerald-100 text-emerald-950 hover:bg-emerald-50'
            : 'bg-amber-100 text-amber-950 hover:bg-amber-50'
        }`}
      >
        {busy
          ? '…'
          : enabled
            ? 'Открыть для всех'
            : 'Включить режим тестов'}
      </button>

      {error && (
        <div className="absolute mt-16 text-xs text-red-400">{error}</div>
      )}
    </motion.div>
  )
}
