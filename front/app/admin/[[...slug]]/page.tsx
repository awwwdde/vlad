import AdminEntry from '@/admin/AdminEntry'

// Админка целиком остаётся SPA на react-router: опциональный catch-all отдаёт
// одну и ту же страницу на любой /admin/*, дальше маршрутизацию ведёт роутер
// внутри AdminApp (basename="/admin").
export const dynamic = 'force-static'

export const metadata = {
  title: 'admin',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminEntry />
}
