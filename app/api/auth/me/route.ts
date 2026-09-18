import { getCurrentUser } from '@/lib/auth'
import { handleRoute, successResponse } from '@/lib/api'

export async function GET() {
  return handleRoute(async () => {
    const user = await getCurrentUser()
    return successResponse({ user })
  })
}
