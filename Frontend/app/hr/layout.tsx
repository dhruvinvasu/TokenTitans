'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { auth } from '@/lib/api'

const NAV = [
  { href: '/hr/dashboard', label: 'Dashboard' },
  { href: '/hr/candidates', label: 'Candidates' },
  { href: '/hr/assistant', label: 'AI Assistant' },
]

export default function HrLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const isLogin = pathname === '/hr/login'

  useEffect(() => {
    if (isLogin) {
      setReady(true)
      return
    }
    if (!auth.token) {
      router.replace('/hr/login')
      return
    }
    setReady(true)
  }, [isLogin, router])

  if (!ready) return null
  if (isLogin) return <>{children}</>

  return (
    <>
      <div className="navbar">
        <strong>HR Console</strong>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname.startsWith(item.href) ? 'active' : ''}
          >
            {item.label}
          </Link>
        ))}
        <div className="spacer" />
        <button
          className="btn-ghost"
          onClick={() => {
            auth.clear()
            router.replace('/hr/login')
          }}
        >
          Logout
        </button>
      </div>
      <div className="container">{children}</div>
    </>
  )
}
