import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/admin/api'
import type { Project } from '@/admin/types'
import { STATUS_META } from './projectStatus'

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
