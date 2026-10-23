'use client'

import { useEffect, useState } from 'react'
import { api } from '@/admin/api'
import { AdminButton, ErrorNote, StatusBadge } from '@/admin/ui'

export type Readiness = { at: string; can_deploy: boolean; checks: { key?: string; label: string; status: string; message: string }[] }

export function ServerDiagnostics({ slug }: { slug?: string }) {
  const [data, setData] = useState<Readiness | null>(null)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    const load = async () => {
      setChecking(true)
      try {
        const result = await api<Readiness>(slug ? `/api/projects/${slug}/readiness` : '/api/system/diagnostics', { signal: controller.signal })
        if (!cancelled) { setData(result); setError('') }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) }
      finally { if (!cancelled) setChecking(false) }
    }
    void load()
    return () => { cancelled = true; controller.abort() }
  }, [slug, revision])
  return <section className="space-y-5 rounded-2xl border border-line p-5 md:p-7">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-medium">Готовность к выкладке</h2><p className="mt-2 text-sm text-muted">Проверка доступности без запуска сборки и изменения контейнеров.</p></div><AdminButton busy={checking} onClick={() => setRevision(value => value + 1)}>Проверить снова</AdminButton></div>
    {error && <ErrorNote>{error} Результат ниже может быть устаревшим.</ErrorNote>}
    {data && <><div className="flex flex-wrap items-center gap-3"><StatusBadge label={data.can_deploy ? 'Проверки пройдены' : 'Есть блокирующие проблемы'} tone={data.can_deploy ? 'good' : 'critical'} /><span className="text-xs text-muted">{new Date(data.at).toLocaleString('ru-RU')}</span></div><ul className="grid gap-3 lg:grid-cols-2">{data.checks.map((check, index) => <li key={`${check.label}-${index}`} className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">{check.label}</h3><StatusBadge label={check.status === 'ok' ? 'OK' : check.status === 'error' ? 'Ошибка' : 'Учесть'} tone={check.status === 'ok' ? 'good' : check.status === 'error' ? 'critical' : 'warning'} /></div><p className="mt-3 text-sm leading-relaxed text-muted">{check.message}</p></li>)}</ul></>}
    {!data && !error && <p className="text-sm text-muted">Проверяю сервер{slug ? ' и источник проекта' : ''}…</p>}
    <p className="text-xs leading-relaxed text-muted">Успешная диагностика не гарантирует сборку или публичный HTTPS: результат зависит от Dockerfile, ресурсов и DNS. При первом запуске worker потребуется до 10 секунд для heartbeat.</p>
  </section>
}
