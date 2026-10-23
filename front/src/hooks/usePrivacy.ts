'use client'

import { useEffect, useState } from 'react'
import draft from '@/lib/privacyDraft.json'
import { useSiteSettings } from './useSiteSettings'

export type LegalSection = { title: string; body: string; id?: string }
export type PrivacyDocument = { ready: boolean; version: string; policy: LegalSection[]; consent: LegalSection[]; contact_email?: string }

export function usePrivacy() {
  const settings = useSiteSettings()
  const [document, setDocument] = useState<PrivacyDocument | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    const abort = new AbortController()
    fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? ''}/api/privacy`, { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(8000)]), cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Privacy unavailable'); return r.json() as Promise<PrivacyDocument> })
      .then(setDocument)
      .catch(() => { if (!abort.signal.aborted) { setDocument(draft); setFailed(true) } })
    return () => abort.abort()
  }, [settings])
  return { document, failed }
}
