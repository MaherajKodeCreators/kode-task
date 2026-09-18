import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { handleRoute, parseBody, successResponse } from '@/lib/api'
import { doctorCreateSchema } from '@/lib/validations'

/**
 * GET /api/doctors
 * Any signed-in user. Patients only ever see active doctors; admins see all.
 */
export async function GET() {
  return handleRoute(async () => {
    const auth = await requireApiUser()
    if (!auth.ok) return auth.response

    const isAdmin = auth.user.role === 'ADMIN'

    const doctors = await prisma.doctor.findMany({
      where: isAdmin ? {} : { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        specialization: true,
        email: true,
        phone: true,
        isActive: true,
        _count: { select: { availabilities: true } },
      },
    })

    return successResponse({
      doctors: doctors.map(({ _count, ...doctor }) => ({
        ...doctor,
        availabilityCount: _count.availabilities,
      })),
    })
  })
}

/** POST /api/doctors - admin only. */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const parsed = await parseBody(request, doctorCreateSchema)
    if (!parsed.ok) return parsed.response

    const { name, specialization, email, phone, isActive } = parsed.data

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialization,
        email: email || null,
        phone: phone || null,
        isActive: isActive ?? true,
      },
    })

    return successResponse({ doctor }, 201)
  })
}
