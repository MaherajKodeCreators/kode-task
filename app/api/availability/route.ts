import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, parseBody, successResponse } from '@/lib/api'
import { availabilitySchema } from '@/lib/validations'
import { formatDateOnly, minutesToTime, parseDateOnly, parseTimeToMinutes, rangesOverlap } from '@/lib/time'

/**
 * GET /api/availability - admin overview of every doctor's availability.
 * Optional filters: ?doctorId=...&date=YYYY-MM-DD
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const params = new URL(request.url).searchParams
    const doctorId = params.get('doctorId')
    const dateParam = params.get('date')

    let date: Date | undefined
    if (dateParam) {
      const parsed = parseDateOnly(dateParam)
      if (!parsed) return errorResponse('Use a valid date (YYYY-MM-DD).', 400)
      date = parsed
    }

    const records = await prisma.doctorAvailability.findMany({
      where: { ...(doctorId && { doctorId }), ...(date && { date }) },
      orderBy: [{ date: 'asc' }, { doctor: { name: 'asc' } }, { startMinutes: 'asc' }],
      include: { doctor: { select: { id: true, name: true, specialization: true, isActive: true } } },
    })

    return successResponse({
      availabilities: records.map((record) => ({
        id: record.id,
        doctorId: record.doctorId,
        doctor: record.doctor,
        date: formatDateOnly(record.date),
        startTime: minutesToTime(record.startMinutes),
        endTime: minutesToTime(record.endMinutes),
      })),
    })
  })
}

/**
 * POST /api/availability - admin only. Adds a new availability window for a
 * doctor on a date. A doctor can have several windows per day (split hours),
 * so this always creates a new row rather than upserting one.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const parsed = await parseBody(request, availabilitySchema)
    if (!parsed.ok) return parsed.response

    const { doctorId, date: dateInput, startTime, endTime } = parsed.data
    const date = parseDateOnly(dateInput)!
    const startMinutes = parseTimeToMinutes(startTime)!
    const endMinutes = parseTimeToMinutes(endTime)!

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) return errorResponse('Doctor not found.', 404)

    // Split-hours windows must not overlap each other (e.g. 9-1 and 12-5 would
    // double-count 12-1).
    const existingWindows = await prisma.doctorAvailability.findMany({
      where: { doctorId, date },
    })
    const overlapsExisting = existingWindows.some((window) =>
      rangesOverlap({ startMinutes, endMinutes }, window)
    )
    if (overlapsExisting) {
      return errorResponse('This window overlaps an existing availability period for that day.', 409)
    }

    const availability = await prisma.doctorAvailability.create({
      data: { doctorId, date, startMinutes, endMinutes },
    })

    return successResponse(
      {
        availability: {
          id: availability.id,
          doctorId: availability.doctorId,
          date: formatDateOnly(availability.date),
          startTime: minutesToTime(availability.startMinutes),
          endTime: minutesToTime(availability.endMinutes),
        },
      },
      201
    )
  })
}

/** DELETE /api/availability?id=... - admin only. Removes a single window. */
export async function DELETE(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return errorResponse('id is required.', 400)

    const existing = await prisma.doctorAvailability.findUnique({ where: { id } })
    if (!existing) return errorResponse('Availability not found.', 404)

    // Block removal if a booked appointment sits inside this specific window -
    // removing it would leave that appointment with no availability at all.
    const booked = await prisma.appointment.count({
      where: {
        doctorId: existing.doctorId,
        date: existing.date,
        status: 'BOOKED',
        startMinutes: { gte: existing.startMinutes },
        endMinutes: { lte: existing.endMinutes },
      },
    })
    if (booked > 0) {
      return errorResponse(
        'This window has booked appointments. Cancel them before removing it.',
        409
      )
    }

    await prisma.doctorAvailability.delete({ where: { id } })
    return successResponse({ message: 'Availability removed.' })
  })
}
