import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, successResponse } from '@/lib/api'
import {
  formatDateOnly,
  generateDaySlotStarts,
  minutesToLabel,
  minutesToTime,
  nowMinutesUtc,
  parseDateOnly,
  SLOT_MINUTES,
  todayUtc,
} from '@/lib/time'

/**
 * GET /api/doctors/[id]/availability
 *
 * Without ?date: the doctor's upcoming days that have at least one
 * availability window.
 * With ?date=YYYY-MM-DD: the bookable slots for that day, across every
 * availability window for the doctor that day (split hours), minus breaks
 * and already-booked slots.
 */
export async function GET(request: Request, ctx: RouteContext<'/api/doctors/[id]/availability'>) {
  return handleRoute(async () => {
    const auth = await requireApiUser()
    if (!auth.ok) return auth.response

    const { id: doctorId } = await ctx.params

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) return errorResponse('Doctor not found.', 404)
    if (!doctor.isActive && auth.user.role !== 'ADMIN') {
      return errorResponse('Doctor not found.', 404)
    }
    if (!doctor.isActive) {
      return errorResponse('This doctor is not currently accepting appointments.', 409)
    }

    const dateParam = new URL(request.url).searchParams.get('date')

    // No date: list upcoming days that have at least one availability window.
    if (!dateParam) {
      const upcoming = await prisma.doctorAvailability.findMany({
        where: { doctorId, date: { gte: todayUtc() } },
        orderBy: [{ date: 'asc' }, { startMinutes: 'asc' }],
        take: 90,
      })

      const byDate = new Map<string, { startTime: string; endTime: string }[]>()
      for (const window of upcoming) {
        const key = formatDateOnly(window.date)
        const list = byDate.get(key) ?? []
        list.push({ startTime: minutesToTime(window.startMinutes), endTime: minutesToTime(window.endMinutes) })
        byDate.set(key, list)
      }

      return successResponse({
        doctor: { id: doctor.id, name: doctor.name, specialization: doctor.specialization },
        days: Array.from(byDate.entries())
          .slice(0, 30)
          .map(([date, windows]) => ({ date, windows })),
      })
    }

    const date = parseDateOnly(dateParam)
    if (!date) return errorResponse('Use a valid date (YYYY-MM-DD).', 400)

    const [windows, breaks, booked] = await Promise.all([
      prisma.doctorAvailability.findMany({ where: { doctorId, date }, orderBy: { startMinutes: 'asc' } }),
      prisma.doctorBreak.findMany({ where: { doctorId, date } }),
      prisma.appointment.findMany({ where: { doctorId, date, status: 'BOOKED' }, select: { startMinutes: true } }),
    ])

    if (windows.length === 0) {
      return successResponse({
        doctor: { id: doctor.id, name: doctor.name, specialization: doctor.specialization },
        date: dateParam,
        windows: [],
        slots: [],
        message: 'This doctor has no availability configured for that date.',
      })
    }

    const takenStarts = new Set(booked.map((appointment) => appointment.startMinutes))

    // Hide slots that already started when the requested date is today.
    const isToday = formatDateOnly(date) === formatDateOnly(todayUtc())
    const nowMinutes = nowMinutesUtc()

    const slots = generateDaySlotStarts(windows, breaks)
      .filter((start) => !takenStarts.has(start))
      .filter((start) => !isToday || start > nowMinutes)
      .map((start) => ({
        startTime: minutesToTime(start),
        endTime: minutesToTime(start + SLOT_MINUTES),
        label: `${minutesToLabel(start)} - ${minutesToLabel(start + SLOT_MINUTES)}`,
      }))

    return successResponse({
      doctor: { id: doctor.id, name: doctor.name, specialization: doctor.specialization },
      date: dateParam,
      windows: windows.map((w) => ({
        startTime: minutesToTime(w.startMinutes),
        endTime: minutesToTime(w.endMinutes),
      })),
      breaks: breaks.map((b) => ({
        startTime: minutesToTime(b.startMinutes),
        endTime: minutesToTime(b.endMinutes),
      })),
      slotMinutes: SLOT_MINUTES,
      slots,
    })
  })
}
