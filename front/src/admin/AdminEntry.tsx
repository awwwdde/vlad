'use client'

import dynamic from 'next/dynamic'

// Публичный сайт не должен тащить бандл админки: грузим её только на /admin/*
// и без SSR — внутри react-router, localStorage и JWT, серверу там делать нечего.
const AdminApp = dynamic(() => import('@/admin/AdminApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-bg text-muted">
      Загрузка админки…
    </div>
  ),
})

export default function AdminEntry() {
  // admin-root помечает поддерево панели: она живёт в своей тёмной палитре,
  // и index.css по этому классу фиксирует фон body (иначе светлая системная
  // тема просвечивала бы за контейнером).
  return (
    <div className="admin-root">
      <AdminApp />
    </div>
  )
}
