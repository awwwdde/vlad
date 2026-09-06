'use client'

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './ProtectedRoute'
import AdminLayout from '@/views/admin/AdminLayout'
import Login from '@/views/admin/Login'
import Dashboard from '@/views/admin/Dashboard'
import Projects from '@/views/admin/Projects'
import Portfolio from '@/views/admin/Portfolio'
import Content from '@/views/admin/Content'
import Messages from '@/views/admin/Messages'

// Корень всей админ-части. Next отдаёт один и тот же документ на любой
// /admin/* (app/admin/[[...slug]]), а дальше маршрутизацию ведёт react-router
// с basename='/admin' — поэтому все пути внутри админки пишутся БЕЗ префикса
// /admin (роутер добавляет его сам).
export default function AdminApp() {
  return (
    <BrowserRouter basename="/admin">
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
