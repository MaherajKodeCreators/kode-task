import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, parseBody, successResponse } from '@/lib/api'
import { doctorUpdateSchema } from '@/lib/validations'

/** GET /api/doctors/[id] - any signed-in user; patients cannot see inactive doctors. */
export async function GET(_request: Request, ctx: RouteContext<'/api/doctors/[id]'>) {
  return handleRoute(async () => {
    const auth = await requireApiUser()
    if (!auth.ok) return auth.response

    const { id } = await ctx.params
    const doctor = await prisma.doctor.findUnique({ where: { id } })

    if (!doctor) return errorResponse('Doctor not found.', 404)
    if (!doctor.isActive && auth.user.role !== 'ADMIN') {
      return errorResponse('Doctor not found.', 404)
    }

    return successResponse({ doctor })
  })
}

/** PATCH /api/doctors/[id] - admin only. */
export async function PATCH(request: Request, ctx: RouteContext<'/api/doctors/[id]'>) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const { id } = await ctx.params
    const parsed = await parseBody(request, doctorUpdateSchema)
    if (!parsed.ok) return parsed.response

    const existing = await prisma.doctor.findUnique({ where: { id } })
    if (!existing) return errorResponse('Doctor not found.', 404)

    const { name, specialization, email, phone, isActive } = parsed.data

    const doctor = await prisma.doctor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(specialization !== undefined && { specialization }),
        ...(email !== undefined && { email: email || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    return successResponse({ doctor })
  })
}

/**
 * DELETE /api/doctors/[id] - admin only.
 *
 * Deactivates by default so appointment history survives. `?hard=true` removes
 * the row entirely (cascading to availability and appointments).
 */
export async function DELETE(request: Request, ctx: RouteContext<'/api/doctors/[id]'>) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const { id } = await ctx.params
    const existing = await prisma.doctor.findUnique({ where: { id } })
    if (!existing) return errorResponse('Doctor not found.', 404)

    const hard = new URL(request.url).searchParams.get('hard') === 'true'

    if (hard) {
      await prisma.doctor.delete({ where: { id } })
      return successResponse({ message: 'Doctor deleted.' })
    }

    const doctor = await prisma.doctor.update({
      where: { id },
      data: { isActive: false },
    })

    return successResponse({ doctor, message: 'Doctor deactivated.' })
  })
}
