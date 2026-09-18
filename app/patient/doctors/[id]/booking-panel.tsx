'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api-client'
import type { Appointment, Slot } from '@/types'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Card, EmptyState, Spinner } from '@/components/ui/card'

type SlotsResponse = {
  date: string
  windows: { startTime: string; endTime: string }[]
  breaks?: { startTime: string; endTime: string }[]
  slotMinutes?: number
  slots: Slot[]
  message?: string
}

export function BookingPanel({
  doctorId,
  availableDates,
}: {
  doctorId: string
  availableDates: string[]
}) {
  const router = useRouter()
  const [date, setDate] = useState(availableDates[0] ?? '')
  const [data, setData] = useState<SlotsResponse | null>(null)
  // `loadedDate` (rather than a separate boolean) tracks which date the
  // current `data` belongs to, so "loading" is derived state, not something
  // that has to be set imperatively - it is simply `loadedDate !== date`.
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null)
  const loading = loadedDate !== date

  // `requestId` lets a stale response (from a date the user has since
  // navigated away from, or after unmount) detect it is stale and no-op.
  const requestIdRef = useRef(0)

  /** Applies a slots response to state, ignoring it if a newer request has started. */
  function applySlotsResult(requestId: number, targetDate: string, result: Awaited<ReturnType<typeof apiGet<SlotsResponse>>>) {
    if (requestId !== requestIdRef.current) return
    setLoadedDate(targetDate)
    if (!result.success) {
      setError(result.message)
      setData(null)
      return
    }
    setError(null)
    setData(result.data)
  }

  // Fetch slots whenever the selected date changes. The effect body itself
  // never calls setState directly - only the .then() callback does, once the
  // response is back, which is what react-hooks/set-state-in-effect wants.
  useEffect(() => {
    if (!date) return
    const requestId = ++requestIdRef.current
    apiGet<SlotsResponse>(`/api/doctors/${doctorId}/availability?date=${date}`).then((result) =>
      applySlotsResult(requestId, date, result)
    )
  }, [doctorId, date])

  /** Re-fetches the current date's slots after a booking attempt. */
  async function refreshSlots() {
    if (!date) return
    const requestId = ++requestIdRef.current
    const result = await apiGet<SlotsResponse>(`/api/doctors/${doctorId}/availability?date=${date}`)
    applySlotsResult(requestId, date, result)
  }

  async function book(slot: Slot) {
    setPendingSlot(null)
    setBookingSlot(slot.startTime)
    setError(null)
    setSuccess(null)

    const result = await apiPost<{ appointment: Appointment }>('/api/appointments', {
      doctorId,
      date,
      startTime: slot.startTime,
    })

    setBookingSlot(null)

    if (!result.success) {
      setError(result.message)
      // Someone else may have taken it; refresh so the list reflects reality.
      await refreshSlots()
      return
    }

    setSuccess(`Booked for ${result.data.appointment.date} at ${slot.label}.`)
    await refreshSlots()
    router.refresh()
  }

  if (availableDates.length === 0) {
    return (
      <EmptyState
        title="No upcoming availability"
        description="This doctor has no availability configured yet."
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <label htmlFor="date" className="block text-sm font-medium text-slate-700">
          Select a date
        </label>
        <select
          id="date"
          value={date}
          onChange={(event) => {
            setSuccess(null)
            setPendingSlot(null)
            setDate(event.target.value)
          }}
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {availableDates.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </Card>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {pendingSlot && (
        <Alert kind="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Book {date} at {pendingSlot.label}?
            </span>
            <div className="flex gap-2">
              <Button
                variant="primary"
                loading={bookingSlot === pendingSlot.startTime}
                onClick={() => book(pendingSlot)}
              >
                Confirm
              </Button>
              <Button variant="secondary" onClick={() => setPendingSlot(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-slate-900">Available slots</h2>
        {data && data.windows.length > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Availability{' '}
            {data.windows.map((w, i) => (
              <span key={i}>
                {i > 0 && ', '}
                {w.startTime}–{w.endTime}
              </span>
            ))}{' '}
            · {data.slotMinutes ?? 30}-minute appointments
            {data.breaks && data.breaks.length > 0 && (
              <>
                {' '}
                · Break{data.breaks.length > 1 ? 's' : ''}:{' '}
                {data.breaks.map((b, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {b.startTime}–{b.endTime}
                  </span>
                ))}
              </>
            )}
          </p>
        )}

        {loading ? (
          <Spinner />
        ) : !data || data.slots.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No open slots"
              description={
                data?.message ??
                'Every slot for this date is booked. Try another date.'
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {data.slots.map((slot) => (
              <Button
                key={slot.startTime}
                variant={pendingSlot?.startTime === slot.startTime ? 'primary' : 'secondary'}
                loading={bookingSlot === slot.startTime}
                disabled={bookingSlot !== null}
                onClick={() => {
                  setSuccess(null)
                  setPendingSlot(slot)
                }}
                className="justify-center"
              >
                {slot.startTime}
              </Button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
