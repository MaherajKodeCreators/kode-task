import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'
import type { Role } from '@/app/generated/prisma/enums'

const BCRYPT_ROUNDS = 10

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
}

/**
 * Data Access Layer.
 *
 * `proxy.ts` only does an optimistic cookie check; this is the real
 * authorization boundary. Every protected page and API route resolves the user
 * here, re-reading from the database so a deleted user cannot keep acting on a
 * still-valid cookie.
 *
 * `cache` memoizes per request, so calling it several times in one render
 * issues a single query.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const payload = verifySessionToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, name: true, email: true, role: true },
  })

  return user ?? null
})

/* ---------------------------------------------------------------------------
 * Page guards - redirect the browser.
 * ------------------------------------------------------------------------- */

export async function requirePatientPage(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'PATIENT') redirect('/admin')
  return user
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role !== 'ADMIN') redirect('/patient')
  return user
}

/* ---------------------------------------------------------------------------
 * API guards - return a user or an error Response, never redirect.
 * ------------------------------------------------------------------------- */

import { errorResponse } from '@/lib/api'

type ApiGuardResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: Response }

export async function requireApiUser(role?: Role): Promise<ApiGuardResult> {
  const user = await getCurrentUser()

  if (!user) {
    return { ok: false, response: errorResponse('You must be signed in.', 401) }
  }
  if (role && user.role !== role) {
    // Deliberately vague: do not confirm what exists behind an admin route.
    return { ok: false, response: errorResponse('Not allowed.', 403) }
  }

  return { ok: true, user }
}
