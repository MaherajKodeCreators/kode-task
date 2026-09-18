import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, successResponse } from '@/lib/api'
import { formatDateOnly, minutesToLabel, minutesToTime } from '@/lib/time'

/** GET /api/appointments/[id] - the owning patient only. */
export async function GET(_request: Request, ctx: RouteContext<'/api/appointments/[id]'>) {
  return handleRoute(async () => {
    const auth = await requireApiUser('PATIENT')
    if (!auth.ok) return auth.response

    const { id } = await ctx.params

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { doctor: { select: { id: true, name: true, specialization: true } } },
    })

    if (!appointment || appointment.patientId !== auth.user.id) {
      return errorResponse('Appointment not found.', 404)
    }

    return successResponse({
      appointment: {
        id: appointment.id,
        date: formatDateOnly(appointment.date),
        startTime: minutesToTime(appointment.startMinutes),
        endTime: minutesToTime(appointment.endMinutes),
        label: `${minutesToLabel(appointment.startMinutes)} - ${minutesToLabel(appointment.endMinutes)}`,
        status: appointment.status,
        createdAt: appointment.createdAt.toISOString(),
        doctor: appointment.doctor,
      },
    })
  })
}
