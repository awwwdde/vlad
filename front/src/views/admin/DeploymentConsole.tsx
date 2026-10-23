'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/admin/api'
import type { Deployment, DeploymentLog, DeploymentLogPage } from '@/admin/types'
import { AdminButton, ErrorNote, INPUT_CLASS, StatusBadge } from '@/admin/ui'

const STAGES: Record<string, string> = { queued: 'Очередь', source: 'Исходники', build: 'Сборка', database: 'БД', container: 'Запуск', health: 'Проверка', publish: 'Публикация', complete: 'Готово' }

export function DeploymentConsole({ slug }: { slug: string }) {
  const [history, setHistory] = useState<Deployment[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [error, setError] = useState('')
  const [data, setData] = useState<{ id: number; lines: DeploymentLog[]; attempt: Deployment } | null>(null)
  const [follow, setFollow] = useState(true)
  const viewport = useRef<HTMLDivElement>(null)
  const id = selected ?? history?.[0]?.id ?? null

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false, pending = false
    const load = async () => {
      if (pending || document.hidden) return
      pending = true
      try {
        const result = await api<Deployment[]>(`/api/projects/${slug}/deployments`, { signal: controller.signal })
        if (!cancelled) { setHistory(result); setHistoryError('') }
      } catch (e) { if (!cancelled) setHistoryError(e instanceof Error ? e.message : String(e)) }
      finally { pending = false }
    }
    void load()
    const timer = window.setInterval(load, 3000)
    document.addEventListener('visibilitychange', load)
    return () => { cancelled = true; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [slug])

  useEffect(() => {
    if (id === null) return
    const controller = new AbortController()
    let cancelled = false, pending = false, cursor = 0
    let lines: DeploymentLog[] = []
    const load = async () => {
      if (pending || document.hidden) return
      pending = true
      try {
        for (let page = 0; page < 10; page++) {
          const result = await api<DeploymentLogPage>(`/api/projects/${slug}/deployments/${id}/logs`, { query: { after: cursor }, signal: controller.signal })
          if (cancelled) return
          lines = [...lines, ...result.lines].slice(-5001)
          cursor = result.next_cursor
          setData({ id, lines, attempt: result.deployment }); setError('')
          if (!result.has_more) break
        }
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : String(e)) }
      finally { pending = false }
    }
    void load()
    const timer = window.setInterval(load, 2000)
    document.addEventListener('visibilitychange', load)
    return () => { cancelled = true; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', load) }
  }, [slug, id])

  const current = data?.id === id ? data : null
  const lines = current?.lines
  useEffect(() => {
    if (follow && viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight
  }, [lines, follow])

  function download() {
    if (!current) return
    const text = current.lines.map(line => `${line.at} [${line.stage}] ${line.level.toUpperCase()} ${line.message}`).join('\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `${slug}-deploy-${id}.log`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <section className="space-y-5" aria-label="Консоль выкладки">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h3 className="text-2xl font-medium">Консоль выкладки</h3><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Исходники, сборка, запуск и ошибки до публикации сайта. Вывод сохраняется на сервере и обновляется автоматически.</p></div>
      <AdminButton onClick={download} disabled={!current?.lines.length}>Скачать .log</AdminButton>
    </div>
    {historyError && <ErrorNote>Не удалось загрузить список выкладок: {historyError}</ErrorNote>}
    {history === null && !historyError && <p className="text-muted">Загрузка выкладок…</p>}
    {history?.length === 0 && <p className="rounded-xl border border-line p-5 text-sm text-muted">Выкладок пока нет. Сохраните настройки и нажмите «Развернуть» — журнал появится сразу после добавления задания в очередь.</p>}
    {Boolean(history?.length) && <>
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Выкладка для просмотра" className={`${INPUT_CLASS} sm:max-w-md`} value={selected ?? 'latest'} onChange={event => { setSelected(event.target.value === 'latest' ? null : Number(event.target.value)); setFollow(true) }}>
          <option value="latest">Последняя выкладка</option>
          {history?.map(item => <option key={item.id} value={item.id}>#{item.id} · {new Date(item.started_at).toLocaleString('ru-RU')} · {STAGES[item.stage] ?? item.stage}</option>)}
        </select>
        {current && <StatusBadge label={current.attempt.status === 'running' ? 'Завершено' : current.attempt.status === 'failed' ? 'Ошибка' : STAGES[current.attempt.stage] ?? current.attempt.stage} tone={current.attempt.status === 'running' ? 'good' : current.attempt.status === 'failed' ? 'critical' : 'warning'} />}
        <label className="ml-auto flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />Следить за выводом</label>
      </div>
      {error && <ErrorNote>Не удалось обновить журнал: {error}. Показан последний полученный вывод; повторим запрос автоматически.</ErrorNote>}
      {current?.attempt.error && <ErrorNote>{current.attempt.error}</ErrorNote>}
      <div ref={viewport} tabIndex={0} role="log" aria-label="Вывод выкладки" aria-live="off" className="h-[min(52dvh,520px)] min-h-64 overflow-auto rounded-2xl border border-white/10 bg-[#111b20] p-4 font-mono text-xs leading-6 text-[#d7e3e4] outline-offset-4 md:p-6">
        {!current && <p className="text-[#9cacb0]">Подключение к журналу…</p>}
        {current && current.lines.length === 0 && <p className="text-[#9cacb0]">Подробный вывод отсутствует. Для старых выкладок доступна ошибка в истории; новые сохраняют консоль с момента постановки в очередь.</p>}
        {current?.lines.map(line => <div key={line.id} className="flex items-start gap-3 border-b border-white/[0.035] py-0.5">
          <time dateTime={line.at} className="shrink-0 text-[#80969e]">{new Date(line.at).toLocaleTimeString('ru-RU')}</time>
          <span className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"><span className="text-[#8babad]">[{STAGES[line.stage] ?? line.stage}] </span><span className={line.level === 'error' ? 'text-[#ffb3a7]' : line.level === 'warning' ? 'text-[#e9ca8d]' : ''}>{line.message}</span></span>
        </div>)}
      </div>
      <p className="text-xs leading-relaxed text-muted">Это журнал, команды здесь не выполняются. Сохранение вывода ограничено 5000 строками на выкладку; известные значения секретов скрываются.</p>
    </>}
  </section>
}
