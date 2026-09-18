import { SLOT_MINUTES } from '@/lib/time'

/**
 * Picks the free slot closest to `originalStart` (by absolute distance in
 * minutes; ties go to the earlier slot). `freeStarts` is the full sorted list
 * of bookable slot starts for the day (already has breaks and other bookings
 * removed - see lib/time.ts generateDaySlotStarts). Returns null when the
 * doctor has no free slot left that day.
 */
export function findNearestSlot(freeStarts: number[], originalStart: number): number | null {
  if (freeStarts.length === 0) return null

  let best = freeStarts[0]
  let bestDistance = Math.abs(best - originalStart)

  for (const start of freeStarts) {
    const distance = Math.abs(start - originalStart)
    if (distance < bestDistance || (distance === bestDistance && start < best)) {
      best = start
      bestDistance = distance
    }
  }

  return best
}

export { SLOT_MINUTES }
