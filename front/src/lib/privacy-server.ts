import 'server-only'
import type { PrivacyDocument } from '@/hooks/usePrivacy'
import draft from './privacyDraft.json'

/** Documents must be readable without JavaScript and never served from a stale page cache. */
export async function getPrivacyDocument(): Promise<{ document: PrivacyDocument; failed: boolean }> {
  const origin = process.env.INTERNAL_API_BASE ?? process.env.PANEL_ORIGIN ?? 'http://localhost:8000'
  try {
    const response = await fetch(`${origin}/api/privacy`, { cache: 'no-store', signal: AbortSignal.timeout(3000) })
    if (!response.ok) throw new Error('Privacy unavailable')
    return { document: await response.json() as PrivacyDocument, failed: false }
  } catch {
    return { document: draft, failed: true }
  }
}
