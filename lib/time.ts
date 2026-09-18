/**
 * Time helpers.
 *
 * Times are stored as minutes from midnight (09:00 => 540). Integer math keeps
 * slot comparisons exact and sidesteps timezone drift.
 *
 * Dates are stored in Postgres `date` columns and handled as UTC midnight so a
 * calendar day never shifts based on server timezone.
 */

/** Appointment slot length in minutes. Documented assumption for this task. */
export const SLOT_MINUTES = 30

/** "09:00" -> 540. Returns null when malformed. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

/** 540 -> "09:00". */
export function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** 540 -> "9:00 AM", for display. */
export function minutesToLabel(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  const period = hours < 12 ? 'AM' : 'PM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`
}

/** "2026-09-20" -> Date at UTC midnight. Returns null when invalid. */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  // Rejects overflow like 2026-02-31, which Date would silently roll forward.
  if (date.toISOString().slice(0, 10) !== value) return null
  return date
}

/** Date -> "2026-09-20". */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Today at UTC midnight. */
export function todayUtc(): Date {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
}

/** Minutes since UTC midnight right now, e.g. 12:45 UTC -> 765. */
export function nowMinutesUtc(): number {
  const now = new Date()
  return now.getUTCHours() * 60 + now.getUTCMinutes()
}

/**
 * Slot start times fully inside [startMinutes, endMinutes).
 * A slot is included only when start + SLOT_MINUTES <= end, so no slot ever
 * runs past the doctor's availability window.
 */
export function generateSlotStarts(startMinutes: number, endMinutes: number): number[] {
  const slots: number[] = []
  for (let t = startMinutes; t + SLOT_MINUTES <= endMinutes; t += SLOT_MINUTES) {
    slots.push(t)
  }
  return slots
}

export type MinuteRange = { startMinutes: number; endMinutes: number }

/** True when [aStart, aEnd) and [bStart, bEnd) share any minute. */
export function rangesOverlap(a: MinuteRange, b: MinuteRange): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes
}

/**
 * All bookable slot starts across every availability window for a day, minus
 * anything that falls in a break. A doctor can have several split-hours
 * windows (e.g. 09:00-13:00 and 14:00-17:00); the gap between them never
 * produces a slot because each window is walked independently.
 */
export function generateDaySlotStarts(
  windows: MinuteRange[],
  breaks: MinuteRange[]
): number[] {
  const slots = windows
    .flatMap((window) => generateSlotStarts(window.startMinutes, window.endMinutes))
    .filter(
      (start) =>
        !breaks.some((brk) => rangesOverlap({ startMinutes: start, endMinutes: start + SLOT_MINUTES }, brk))
    )

  return Array.from(new Set(slots)).sort((a, b) => a - b)
}
