import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { errorResponse, handleRoute, parseBody, successResponse } from '@/lib/api'
import { loginSchema } from '@/lib/validations'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session'

export async function POST(request: Request) {
  return handleRoute(async () => {
    const parsed = await parseBody(request, loginSchema)
    if (!parsed.ok) return parsed.response

    const { email, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { email } })

    // One message for "no such user" and "wrong password" so the response
    // cannot be used to discover which emails have accounts.
    const invalid = () => errorResponse('Invalid email or password.', 401)

    if (!user) {
      // Hash anyway so a missing user is not measurably faster to reject.
      await verifyPassword(password, '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv')
      return invalid()
    }

    if (!(await verifyPassword(password, user.passwordHash))) return invalid()

    const cookieStore = await cookies()
    cookieStore.set(
      SESSION_COOKIE,
      createSessionToken(user.id, user.role),
      sessionCookieOptions()
    )

    return successResponse({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  })
}
