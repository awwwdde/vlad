'use client'
import { useEffect } from 'react'

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const unload = (event: BeforeUnloadEvent) => event.preventDefault()
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest('a')
      if (!anchor || anchor.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return
      const target = new URL(anchor.href, location.href)
      if (target.pathname === location.pathname && target.search === location.search) return
      if (!window.confirm('Есть несохранённые изменения. Уйти без сохранения?')) { event.preventDefault(); event.stopPropagation() }
    }
    window.addEventListener('beforeunload', unload)
    document.addEventListener('click', navigate, true)
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', navigate, true) }
  }, [dirty])
}
