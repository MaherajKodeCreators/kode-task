import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, parseBody, successResponse } from '@/lib/api'
import { breakSchema } from '@/lib/validations'
import {
  formatDateOnly,
  generateDaySlotStarts,
  minutesToTime,
  nowMinutesUtc,
  parseDateOnly,
  parseTimeToMinutes,
  rangesOverlap,
  SLOT_MINUTES,
  todayUtc,
} from '@/lib/time'
import { findNearestSlot } from '@/lib/reschedule'

/** GET /api/breaks - admin overview. Optional filters: ?doctorId=...&date=YYYY-MM-DD */
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

    const breaks = await prisma.doctorBreak.findMany({
      where: { ...(doctorId && { doctorId }), ...(date && { date }) },
      orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
      include: { doctor: { select: { id: true, name: true, specialization: true } } },
    })

    return successResponse({
      breaks: breaks.map((b) => ({
        id: b.id,
        doctorId: b.doctorId,
        doctor: b.doctor,
        date: formatDateOnly(b.date),
        startTime: minutesToTime(b.startMinutes),
        endTime: minutesToTime(b.endMinutes),
      })),
    })
  })
}

/**
 * POST /api/breaks - admin only. Adds a break for a doctor on a date.
 *
 * A break can fall inside existing booked appointments. Any BOOKED
 * appointment that overlaps the new break is automatically moved to the
 * nearest free slot for that same doctor/day (see lib/reschedule.ts). If no
 * free slot remains that day, the appointment is left in place and reported
 * back so the admin can handle it manually - the break is still created.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const parsed = await parseBody(request, breakSchema)
    if (!parsed.ok) return parsed.response

    const { doctorId, date: dateInput, startTime, endTime } = parsed.data
    const date = parseDateOnly(dateInput)!
    const startMinutes = parseTimeToMinutes(startTime)!
    const endMinutes = parseTimeToMinutes(endTime)!

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) return errorResponse('Doctor not found.', 404)

    const result = await prisma.$transaction(async (tx) => {
      const doctorBreak = await tx.doctorBreak.create({
        data: { doctorId, date, startMinutes, endMinutes },
      })

      // Everything needed to recompute free slots for this doctor/day.
      const [windows, breaks, bookedAppointments] = await Promise.all([
        tx.doctorAvailability.findMany({ where: { doctorId, date } }),
        tx.doctorBreak.findMany({ where: { doctorId, date } }),
        tx.appointment.findMany({ where: { doctorId, date, status: 'BOOKED' } }),
      ])

      const affected = bookedAppointments.filter((appt) =>
        rangesOverlap(appt, { startMinutes, endMinutes })
      )

      const moved: { appointmentId: string; from: string; to: string | null }[] = []

      // If the break falls on today, a slot that has already started can
      // never be a valid reschedule target - only look at slots still ahead
      // of the current time.
      const isToday = formatDateOnly(date) === formatDateOnly(todayUtc())
      const nowMinutes = nowMinutesUtc()

      for (const appt of affected) {
        // Recompute free slots fresh each iteration so two affected
        // appointments in the same run can't both be moved onto the same slot.
        const stillBooked = await tx.appointment.findMany({
          where: { doctorId, date, status: 'BOOKED', id: { not: appt.id } },
        })
        const freeStarts = generateDaySlotStarts(windows, breaks)
          .filter(
            (start) =>
              !stillBooked.some((b) =>
                rangesOverlap({ startMinutes: start, endMinutes: start + SLOT_MINUTES }, b)
              )
          )
          .filter((start) => !isToday || start > nowMinutes)

        const nearest = findNearestSlot(freeStarts, appt.startMinutes)

        if (nearest === null) {
          // No slot left this day - leave the appointment where it is and
          // surface it so the admin can follow up manually.
          moved.push({
            appointmentId: appt.id,
            from: minutesToTime(appt.startMinutes),
            to: null,
          })
          continue
        }

        await tx.appointment.update({
          where: { id: appt.id },
          data: { startMinutes: nearest, endMinutes: nearest + SLOT_MINUTES },
        })
        moved.push({
          appointmentId: appt.id,
          from: minutesToTime(appt.startMinutes),
          to: minutesToTime(nearest),
        })
      }

      return { doctorBreak, moved }
    })

    return successResponse(
      {
        break: {
          id: result.doctorBreak.id,
          doctorId: result.doctorBreak.doctorId,
          date: formatDateOnly(result.doctorBreak.date),
          startTime: minutesToTime(result.doctorBreak.startMinutes),
          endTime: minutesToTime(result.doctorBreak.endMinutes),
        },
        rescheduled: result.moved,
      },
      201
    )
  })
}

/** DELETE /api/breaks?id=... - admin only. */
export async function DELETE(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('ADMIN')
    if (!auth.ok) return auth.response

    const id = new URL(request.url).searchParams.get('id')
    if (!id) return errorResponse('id is required.', 400)

    const existing = await prisma.doctorBreak.findUnique({ where: { id } })
    if (!existing) return errorResponse('Break not found.', 404)

    await prisma.doctorBreak.delete({ where: { id } })
    return successResponse({ message: 'Break removed.' })
  })
}
