import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, tokenStore } from './api'
import type { LoginResponse, User } from './types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthCtx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // loading = true пока проверяем сохранённый токен; не редиректим раньше времени.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!tokenStore.get()) {
      setLoading(false)
      return
    }
    api<User>('/api/auth/me')
      .then(u => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) tokenStore.clear()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    })
    tokenStore.set(res.access_token)
    setUser(res.user)
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth должен использоваться внутри <AuthProvider>')
  return ctx
}
