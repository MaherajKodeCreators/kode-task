import { prisma } from '@/lib/prisma'
import { requireApiUser } from '@/lib/auth'
import { errorResponse, handleRoute, parseBody, successResponse } from '@/lib/api'
import { bookingSchema } from '@/lib/validations'
import type { AppointmentStatus } from '@/app/generated/prisma/enums'
import {
  formatDateOnly,
  minutesToLabel,
  minutesToTime,
  parseDateOnly,
  parseTimeToMinutes,
  rangesOverlap,
  SLOT_MINUTES,
  todayUtc,
} from '@/lib/time'

type AppointmentWithDoctor = {
  id: string
  date: Date
  startMinutes: number
  endMinutes: number
  status: AppointmentStatus
  createdAt: Date
  doctor: { id: string; name: string; specialization: string }
}

/** Shapes an appointment row for the client. */
function serialize(appointment: AppointmentWithDoctor) {
  return {
    id: appointment.id,
    date: formatDateOnly(appointment.date),
    startTime: minutesToTime(appointment.startMinutes),
    endTime: minutesToTime(appointment.endMinutes),
    label: `${minutesToLabel(appointment.startMinutes)} - ${minutesToLabel(appointment.endMinutes)}`,
    status: appointment.status,
    createdAt: appointment.createdAt.toISOString(),
    doctor: appointment.doctor,
  }
}

/**
 * GET /api/appointments - the signed-in patient's own appointments.
 * Scoped by patientId from the session, so one patient can never read another's.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('PATIENT')
    if (!auth.ok) return auth.response

    const statusParam = new URL(request.url).searchParams.get('status')
    const status: AppointmentStatus | undefined =
      statusParam === 'BOOKED' || statusParam === 'CANCELLED' ? statusParam : undefined

    const appointments = await prisma.appointment.findMany({
      where: { patientId: auth.user.id, ...(status && { status }) },
      orderBy: [{ date: 'desc' }, { startMinutes: 'desc' }],
      include: { doctor: { select: { id: true, name: true, specialization: true } } },
    })

    return successResponse({ appointments: appointments.map(serialize) })
  })
}

/**
 * POST /api/appointments - book a slot.
 *
 * Validation order: authenticated -> doctor active -> availability exists ->
 * slot inside window -> slot free -> create.
 *
 * The final guarantee is the partial unique index
 * (doctorId, date, startMinutes) WHERE status = 'BOOKED'. Two concurrent
 * requests for the same slot both pass the read check, then exactly one insert
 * succeeds and the other raises P2002, which is returned as a clean 409.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const auth = await requireApiUser('PATIENT')
    if (!auth.ok) return auth.response

    const parsed = await parseBody(request, bookingSchema)
    if (!parsed.ok) return parsed.response

    const { doctorId, date: dateInput, startTime } = parsed.data
    const date = parseDateOnly(dateInput)!
    const startMinutes = parseTimeToMinutes(startTime)!
    const endMinutes = startMinutes + SLOT_MINUTES

    if (date < todayUtc()) {
      return errorResponse('That date is in the past.', 400)
    }

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } })
    if (!doctor) return errorResponse('Doctor not found.', 404)
    if (!doctor.isActive) {
      return errorResponse('This doctor is not currently accepting appointments.', 409)
    }

    // A doctor can have several availability windows that day (split hours);
    // the slot only has to fit inside ONE of them.
    const windows = await prisma.doctorAvailability.findMany({ where: { doctorId, date } })
    if (windows.length === 0) {
      return errorResponse('This doctor has no availability for that date.', 409)
    }

    const containingWindow = windows.find(
      (window) =>
        startMinutes >= window.startMinutes &&
        endMinutes <= window.endMinutes &&
        (startMinutes - window.startMinutes) % SLOT_MINUTES === 0
    )
    if (!containingWindow) {
      return errorResponse('That time is outside the doctor’s availability.', 409)
    }

    const breaks = await prisma.doctorBreak.findMany({ where: { doctorId, date } })
    const inBreak = breaks.some((brk) => rangesOverlap({ startMinutes, endMinutes }, brk))
    if (inBreak) {
      return errorResponse('The doctor is on a break at that time.', 409)
    }

    // Stops one patient holding two doctors at the same moment.
    const patientClash = await prisma.appointment.findFirst({
      where: { patientId: auth.user.id, date, startMinutes, status: 'BOOKED' },
    })
    if (patientClash) {
      return errorResponse('You already have an appointment at that time.', 409)
    }

    try {
      const appointment = await prisma.appointment.create({
        data: {
          doctorId,
          patientId: auth.user.id,
          date,
          startMinutes,
          endMinutes,
          status: 'BOOKED',
        },
        include: { doctor: { select: { id: true, name: true, specialization: true } } },
      })

      return successResponse({ appointment: serialize(appointment) }, 201)
    } catch (error) {
      // P2002 = unique constraint violation: another patient won the race.
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        return errorResponse('Sorry, that slot was just booked. Please pick another.', 409)
      }
      throw error
    }
  })
}
