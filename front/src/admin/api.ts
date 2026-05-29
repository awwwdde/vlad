// Тонкая обёртка над fetch для админских вызовов.
// Токен лежит в localStorage (MVP). Для прод-усиления — переехать на httpOnly cookie
// + CSRF-токен; сейчас в обмен на простоту мы держим SPA-логику.

const TOKEN_KEY = 'awwwdde_jwt'

// В dev фронт ходит в http://localhost:8000, в проде — same-origin (Caddy
// проксирует /api/* на panel). VITE_API_BASE можно переопределить в .env.
const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

type Method = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'

interface RequestOptions {
  method?: Method
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
  // Если true — не подставлять токен (для публичного /healthz и login).
  anonymous?: boolean
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal, anonymous } = opts

  const url = new URL(API_BASE + path, window.location.origin)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
    }
  }

  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!anonymous) {
    const token = tokenStore.get()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (res.status === 401 && !anonymous) {
    tokenStore.clear()
    // Мягкий редирект на логин; если уже там — браузер ничего не сделает.
    if (!window.location.pathname.startsWith('/admin/login')) {
      window.location.replace('/admin/login')
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await res.json().catch(() => null) : await res.text()

  if (!res.ok) {
    const detail =
      (payload && typeof payload === 'object' && 'detail' in payload
        ? String(payload.detail)
        : typeof payload === 'string'
        ? payload
        : res.statusText) || 'Ошибка запроса'
    throw new ApiError(res.status, detail)
  }
  return payload as T
}
