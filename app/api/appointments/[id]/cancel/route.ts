import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, successResponse } from '@/lib/api'
import { formatDateOnly, minutesToTime } from '@/lib/time'

/**
 * PATCH /api/appointments/[id]/cancel
 *
 * Sets status to CANCELLED; the row is kept for history. Because the unique
 * index only covers BOOKED rows, cancelling immediately frees the slot.
 *
 * The update is scoped by `patientId` as well as `id`, so a patient cannot
 * cancel someone else's appointment even with a valid appointment id.
 */
export async function PATCH(_request: Request, ctx: RouteContext<'/api/appointments/[id]/cancel'>) {
  return handleRoute(async () => {
    const auth = await requireApiUser('PATIENT')
    if (!auth.ok) return auth.response

    const { id } = await ctx.params

    const existing = await prisma.appointment.findUnique({ where: { id } })

    // Same 404 for "does not exist" and "belongs to someone else" so ids
    // cannot be probed for existence.
    if (!existing || existing.patientId !== auth.user.id) {
      return errorResponse('Appointment not found.', 404)
    }

    if (existing.status === 'CANCELLED') {
      return errorResponse('This appointment is already cancelled.', 409)
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { doctor: { select: { id: true, name: true, specialization: true } } },
    })

    return successResponse({
      appointment: {
        id: appointment.id,
        date: formatDateOnly(appointment.date),
        startTime: minutesToTime(appointment.startMinutes),
        endTime: minutesToTime(appointment.endMinutes),
        status: appointment.status,
        doctor: appointment.doctor,
      },
      message: 'Appointment cancelled. The slot is available again.',
    })
  })
}
