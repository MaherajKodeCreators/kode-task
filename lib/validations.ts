import { z } from 'zod'
import { parseDateOnly, parseTimeToMinutes, SLOT_MINUTES } from '@/lib/time'

/* ---------------------------------- shared -------------------------------- */

const dateOnly = z
  .string()
  .refine((value) => parseDateOnly(value) !== null, 'Use a valid date (YYYY-MM-DD).')

const timeOfDay = z
  .string()
  .refine((value) => parseTimeToMinutes(value) !== null, 'Use a valid time (HH:MM).')

/* ----------------------------------- auth --------------------------------- */

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  email: z.email('Enter a valid email address.').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
})

export const loginSchema = z.object({
  email: z.email('Enter a valid email address.').toLowerCase().trim(),
  password: z.string().min(1, 'Enter your password.'),
})

/* ---------------------------------- doctors ------------------------------- */

export const doctorCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80),
  specialization: z.string().trim().min(2, 'Specialization is required.').max(80),
  email: z.email('Enter a valid email address.').trim().optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
})

export const doctorUpdateSchema = doctorCreateSchema.partial()

/* ------------------------------- availability ----------------------------- */

export const availabilitySchema = z
  .object({
    doctorId: z.string().min(1, 'Select a doctor.'),
    date: dateOnly,
    startTime: timeOfDay,
    endTime: timeOfDay,
  })
  .superRefine((value, ctx) => {
    const start = parseTimeToMinutes(value.startTime)
    const end = parseTimeToMinutes(value.endTime)
    if (start === null || end === null) return

    if (end <= start) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: 'End time must be after start time.',
      })
      return
    }

    if (end - start < SLOT_MINUTES) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: `The window must be at least ${SLOT_MINUTES} minutes long.`,
      })
    }
  })

/* ----------------------------------- breaks -------------------------------- */

export const breakSchema = z
  .object({
    doctorId: z.string().min(1, 'Select a doctor.'),
    date: dateOnly,
    startTime: timeOfDay,
    endTime: timeOfDay,
  })
  .superRefine((value, ctx) => {
    const start = parseTimeToMinutes(value.startTime)
    const end = parseTimeToMinutes(value.endTime)
    if (start === null || end === null) return

    if (end <= start) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after start time.' })
    }
  })

/* ------------------------------- appointments ----------------------------- */

export const bookingSchema = z.object({
  doctorId: z.string().min(1, 'Select a doctor.'),
  date: dateOnly,
  startTime: timeOfDay,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type DoctorCreateInput = z.infer<typeof doctorCreateSchema>
export type AvailabilityInput = z.infer<typeof availabilitySchema>
export type BreakInput = z.infer<typeof breakSchema>
export type BookingInput = z.infer<typeof bookingSchema>
