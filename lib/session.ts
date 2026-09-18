import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Role } from '@/app/generated/prisma/enums'

/**
 * Stateless session token: base64url(payload).base64url(hmacSha256(payload)).
 *
 * The signature is what makes the cookie tamper-proof: a user can read their
 * own cookie but cannot forge one claiming role=ADMIN without SESSION_SECRET.
 * The token is stored in an HTTP-only cookie so client JavaScript cannot read
 * it (never localStorage).
 */

export const SESSION_COOKIE = 'session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type SessionPayload = {
  userId: string
  role: Role
  /** Expiry as a unix timestamp in seconds. */
  exp: number
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not set. Copy .env.example to .env.')
  }
  return secret
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function sign(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function createSessionToken(userId: string, role: Role): string {
  const payload: SessionPayload = {
    userId,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  }
  const encoded = base64UrlEncode(JSON.stringify(payload))
  return `${encoded}.${sign(encoded)}`
}

/** Returns the payload only when the signature is valid and unexpired. */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null

  const separator = token.lastIndexOf('.')
  if (separator <= 0) return null

  const encoded = token.slice(0, separator)
  const signature = token.slice(separator + 1)

  const expected = Buffer.from(sign(encoded))
  const received = Buffer.from(signature)
  // Length check first: timingSafeEqual throws on a length mismatch.
  if (expected.length !== received.length) return null
  if (!timingSafeEqual(expected, received)) return null

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as SessionPayload

    if (typeof payload.userId !== 'string' || !payload.userId) return null
    if (payload.role !== 'ADMIN' && payload.role !== 'PATIENT') return null
    if (typeof payload.exp !== 'number') return null
    if (payload.exp * 1000 < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

/** Cookie options shared by login and logout so they always match. */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}
