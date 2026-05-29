// Публичный POST в /api/contact из обеих форм (S6Contact и A2Contact).
// Отдельный helper, потому что src/admin/api.ts тащит Bearer-токен из
// localStorage — публичной форме это не нужно.

const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export interface ContactPayload {
  email: string
  name?: string
  message?: string
  budget?: string
  source: 'home' | 'about' | string
}

export async function submitContact(payload: ContactPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let detail = 'Не удалось отправить'
    try {
      const j = await res.json()
      if (j?.detail) detail = String(j.detail)
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
}
