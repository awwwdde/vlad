import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import AdminLayout from '@/pages/admin/AdminLayout'
import Login from '@/pages/admin/Login'
import Dashboard from '@/pages/admin/Dashboard'
import Projects from '@/pages/admin/Projects'
import Portfolio from '@/pages/admin/Portfolio'
import Content from '@/pages/admin/Content'
import Messages from '@/pages/admin/Messages'

// Корень всей админ-части. Загружается лениво из App.tsx — публичный сайт
// остаётся лёгким, бандл админки тянется только при заходе на /admin/*.
export default function AdminApp() {
  // Класс на body отключает кастомный курсор публички и возвращает обычный
  // (см. index.css → body.admin).
  useEffect(() => {
    document.body.classList.add('admin')
    return () => document.body.classList.remove('admin')
  }, [])

  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="content" element={<Content />} />
          <Route path="messages" element={<Messages />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AuthProvider>
  )
}
