'use client'

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { PORTFOLIO_THEME } from '@/lib/siteTheme'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  // Пока проверяем сохранённый JWT — рисуем нейтральный экран, чтобы не моргало
  // редиректом на /login и обратно.
  if (loading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${PORTFOLIO_THEME}`}>
        Загрузка…
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
