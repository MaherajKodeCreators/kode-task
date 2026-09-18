import { cookies } from 'next/headers'
import { handleRoute, successResponse } from '@/lib/api'
import { SESSION_COOKIE } from '@/lib/session'

export async function POST() {
  return handleRoute(async () => {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE)
    return successResponse({ message: 'Signed out.' })
  })
}
