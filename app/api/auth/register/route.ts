import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { errorResponse, handleRoute, parseBody, successResponse } from '@/lib/api'
import { registerSchema } from '@/lib/validations'
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/session'

export async function POST(request: Request) {
  return handleRoute(async () => {
    const parsed = await parseBody(request, registerSchema)
    if (!parsed.ok) return parsed.response

    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return errorResponse('That email is already registered.', 409)
    }

    // Patients self-register; the ADMIN role is only ever set by the seed.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        role: 'PATIENT',
      },
      select: { id: true, name: true, email: true, role: true },
    })

    // Sign the new patient straight in.
    const cookieStore = await cookies()
    cookieStore.set(
      SESSION_COOKIE,
      createSessionToken(user.id, user.role),
      sessionCookieOptions()
    )

    return successResponse({ user }, 201)
  })
}
