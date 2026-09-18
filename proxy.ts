import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

/**
 * Next.js 16 renamed `middleware` to `proxy`.
 *
 * This is an OPTIMISTIC check only: it keeps signed-out visitors off portal
 * pages without a database round trip. Real authorization happens per request
 * in the Data Access Layer (`lib/auth.ts`), which re-reads the user. Never rely
 * on this file alone to protect data.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)

  const isAdminArea = pathname.startsWith('/admin')
  const isPatientArea = pathname.startsWith('/patient')
  const isAuthPage = pathname === '/login' || pathname === '/register'

  if (!session && (isAdminArea || isPatientArea)) {
    const url = new URL('/login', request.nextUrl)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (session) {
    // Send signed-in users away from the auth pages to their own portal.
    if (isAuthPage) {
      return NextResponse.redirect(
        new URL(session.role === 'ADMIN' ? '/admin' : '/patient', request.nextUrl)
      )
    }
    // Keep each role inside its own portal.
    if (isAdminArea && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/patient', request.nextUrl))
    }
    if (isPatientArea && session.role !== 'PATIENT') {
      return NextResponse.redirect(new URL('/admin', request.nextUrl))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/patient/:path*', '/login', '/register'],
}
