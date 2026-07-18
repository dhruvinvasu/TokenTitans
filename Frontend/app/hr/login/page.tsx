'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api, auth } from '@/lib/api'

export default function HrLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api<{ token: string; user: { role?: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      if (res.user.role !== 'HR') {
        setError('This portal is for HR accounts only.')
        return
      }
      auth.set(res.token)
      router.replace('/hr/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 400, marginTop: 80 }}>
      <div className="card">
        <h1>HR Login</h1>
        <p className="muted">Sign in to manage candidates and jobs.</p>
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
