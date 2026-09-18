'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { apiPost } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

type NavLink = { href: string; label: string }

export function PortalNav({
  title,
  links,
  userName,
}: {
  title: string
  links: NavLink[]
  userName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    await apiPost('/api/auth/logout', {})
    router.push('/')
    router.refresh()
  }

  return (
    <header className="border-b border-border-light bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-white">
              {title.charAt(0)}
            </span>
            {title}
          </span>
          <nav className="flex gap-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-sidebar-active-bg text-primary'
                      : 'text-gray-700 hover:bg-primary/5'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-text-secondary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold text-text-secondary">
              {userName.charAt(0).toUpperCase()}
            </span>
            {userName}
          </span>
          <Button variant="secondary" size="sm" loading={loggingOut} onClick={handleLogout}>
            {loggingOut ? 'Signing out…' : 'Logout'}
          </Button>
        </div>
      </div>
    </header>
  )
}
