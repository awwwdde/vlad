import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/admin/AuthContext'
import { ApiError } from '@/admin/api'

export default function Login() {
  const { login, user } = useAuth()
  const nav = useNavigate()
  const location = useLocation() as { state: { from?: string } | null }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Если уже залогинен и пришли на /login — отправим в админку.
  useEffect(() => {
    if (user) nav('/admin', { replace: true })
  }, [user, nav])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password)
      nav(location.state?.from && location.state.from.startsWith('/admin')
        ? location.state.from
        : '/admin', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-neutral-100 px-4">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8 backdrop-blur"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">awwwdde / admin</h1>
          <p className="text-sm text-neutral-500">Вход в панель управления</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-neutral-500">email</span>
          <input
            type="email"
            required
            autoFocus
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs uppercase tracking-wider text-neutral-500">пароль</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-neutral-600"
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-950 transition hover:bg-white disabled:opacity-50"
        >
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </motion.form>
    </div>
  )
}
