'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { availabilitySchema, breakSchema, type AvailabilityInput, type BreakInput } from '@/lib/validations'
import { apiDelete, apiGet, apiPost } from '@/lib/api-client'
import type { AvailabilityDay, Doctor, DoctorBreak } from '@/types'
import { Button } from '@/components/ui/button'
import { InputField, SelectField } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import { Card, EmptyState, Spinner } from '@/components/ui/card'
import { formatDateOnly, minutesToLabel, parseTimeToMinutes, todayUtc } from '@/lib/time'

const TODAY = formatDateOnly(todayUtc())

function formatWindow(startTime: string, endTime: string) {
  const start = parseTimeToMinutes(startTime)
  const end = parseTimeToMinutes(endTime)
  if (start === null || end === null) return `${startTime} - ${endTime}`
  return `${minutesToLabel(start)} - ${minutesToLabel(end)}`
}

type RescheduledNote = { appointmentId: string; from: string; to: string | null }

export function AvailabilityManager() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [days, setDays] = useState<AvailabilityDay[] | null>(null)
  const [breaks, setBreaks] = useState<DoctorBreak[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [rescheduled, setRescheduled] = useState<RescheduledNote[]>([])
  const [pendingId, setPendingId] = useState<string | null>(null)

  const availabilityForm = useForm<AvailabilityInput>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: { startTime: '09:00', endTime: '13:00' },
  })

  const breakForm = useForm<BreakInput>({
    resolver: zodResolver(breakSchema),
  })

  async function loadAvailability() {
    const result = await apiGet<{ availabilities: AvailabilityDay[] }>('/api/availability')
    if (result.success) setDays(result.data.availabilities)
  }

  async function loadBreaks() {
    const result = await apiGet<{ breaks: DoctorBreak[] }>('/api/breaks')
    if (result.success) setBreaks(result.data.breaks)
  }

  // Fetch on mount. `cancelled` stops a slow response from setting state
  // after the component has unmounted.
  useEffect(() => {
    let cancelled = false

    apiGet<{ doctors: Doctor[] }>('/api/doctors').then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.message)
        return
      }
      setDoctors(result.data.doctors)
    })

    apiGet<{ availabilities: AvailabilityDay[] }>('/api/availability').then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.message)
        return
      }
      setDays(result.data.availabilities)
    })

    apiGet<{ breaks: DoctorBreak[] }>('/api/breaks').then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.message)
        return
      }
      setBreaks(result.data.breaks)
    })

    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmitAvailability(values: AvailabilityInput) {
    setError(null)
    setSuccess(null)

    const result = await apiPost<{ availability: AvailabilityDay }>('/api/availability', values)
    if (!result.success) {
      setError(result.message)
      return
    }

    setSuccess('Availability window added.')
    availabilityForm.reset({ ...values })
    await loadAvailability()
  }

  async function removeDay(day: AvailabilityDay) {
    setError(null)
    setSuccess(null)
    setPendingId(day.id)

    const result = await apiDelete<{ message: string }>(`/api/availability?id=${day.id}`)

    setPendingId(null)
    if (!result.success) {
      setError(result.message)
      return
    }
    setSuccess('Availability removed.')
    await loadAvailability()
  }

  async function onSubmitBreak(values: BreakInput) {
    setError(null)
    setSuccess(null)
    setRescheduled([])

    const result = await apiPost<{ break: DoctorBreak; rescheduled: RescheduledNote[] }>(
      '/api/breaks',
      values
    )
    if (!result.success) {
      setError(result.message)
      return
    }

    setSuccess('Break added.')
    setRescheduled(result.data.rescheduled)
    breakForm.reset({ ...values })
    await Promise.all([loadBreaks(), loadAvailability()])
  }

  async function removeBreak(brk: DoctorBreak) {
    setError(null)
    setSuccess(null)
    setPendingId(brk.id)

    const result = await apiDelete<{ message: string }>(`/api/breaks?id=${brk.id}`)

    setPendingId(null)
    if (!result.success) {
      setError(result.message)
      return
    }
    setSuccess('Break removed.')
    await loadBreaks()
  }

  const activeDoctors = doctors?.filter((doctor) => doctor.isActive) ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Doctor availability</h1>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {rescheduled.length > 0 && (
        <Alert kind="info">
          <p className="font-medium">Appointments affected by this break:</p>
          <ul className="mt-1 list-disc pl-5">
            {rescheduled.map((r) => (
              <li key={r.appointmentId}>
                {r.from} →{' '}
                {r.to ? (
                  <span className="font-medium">{r.to} (moved)</span>
                ) : (
                  <span className="text-red-600">no free slot left that day — needs manual review</span>
                )}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <Card className="max-w-2xl">
        <h2 className="text-sm font-semibold text-slate-900">Add availability window</h2>
        <p className="mt-1 text-xs text-slate-500">
          A doctor can have several windows per day for split hours (e.g. 9–1 and 2–5). New windows
          must not overlap existing ones.
        </p>

        {doctors === null ? (
          <Spinner />
        ) : activeDoctors.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No active doctors"
              description="Add or activate a doctor before setting availability."
            />
          </div>
        ) : (
          <form
            onSubmit={availabilityForm.handleSubmit(onSubmitAvailability)}
            className="mt-4 space-y-4"
            noValidate
          >
            <SelectField
              label="Doctor"
              error={availabilityForm.formState.errors.doctorId?.message}
              defaultValue=""
              {...availabilityForm.register('doctorId')}
            >
              <option value="" disabled>
                Select a doctor
              </option>
              {activeDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} — {doctor.specialization}
                </option>
              ))}
            </SelectField>

            <InputField
              label="Date"
              type="date"
              min={TODAY}
              error={availabilityForm.formState.errors.date?.message}
              {...availabilityForm.register('date')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Start time"
                type="time"
                step={1800}
                error={availabilityForm.formState.errors.startTime?.message}
                {...availabilityForm.register('startTime')}
              />
              <InputField
                label="End time"
                type="time"
                step={1800}
                error={availabilityForm.formState.errors.endTime?.message}
                {...availabilityForm.register('endTime')}
              />
            </div>

            <Button type="submit" loading={availabilityForm.formState.isSubmitting}>
              Add window
            </Button>
          </form>
        )}
      </Card>

      <Card className="max-w-2xl">
        <h2 className="text-sm font-semibold text-slate-900">Add a doctor break</h2>
        <p className="mt-1 text-xs text-slate-500">
          If a booked appointment falls inside the break, it is automatically moved to the nearest
          free slot that day.
        </p>

        {doctors === null ? (
          <Spinner />
        ) : activeDoctors.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No active doctors" />
          </div>
        ) : (
          <form onSubmit={breakForm.handleSubmit(onSubmitBreak)} className="mt-4 space-y-4" noValidate>
            <SelectField
              label="Doctor"
              error={breakForm.formState.errors.doctorId?.message}
              defaultValue=""
              {...breakForm.register('doctorId')}
            >
              <option value="" disabled>
                Select a doctor
              </option>
              {activeDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} — {doctor.specialization}
                </option>
              ))}
            </SelectField>

            <InputField
              label="Date"
              type="date"
              min={TODAY}
              error={breakForm.formState.errors.date?.message}
              {...breakForm.register('date')}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Break start"
                type="time"
                step={1800}
                error={breakForm.formState.errors.startTime?.message}
                {...breakForm.register('startTime')}
              />
              <InputField
                label="Break end"
                type="time"
                step={1800}
                error={breakForm.formState.errors.endTime?.message}
                {...breakForm.register('endTime')}
              />
            </div>

            <Button type="submit" variant="secondary" loading={breakForm.formState.isSubmitting}>
              Add break
            </Button>
          </form>
        )}
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">All availability windows</h2>

        {days === null ? (
          <Spinner />
        ) : days.length === 0 ? (
          <EmptyState title="No availability configured yet" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Doctor</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Window</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {days.map((day) => (
                  <tr key={day.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{day.doctor?.name}</span>
                      <span className="block text-xs text-slate-500">
                        {day.doctor?.specialization}
                        {day.doctor && !day.doctor.isActive && ' · inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{day.date}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatWindow(day.startTime, day.endTime)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeDay(day)}
                        disabled={pendingId === day.id}
                        className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {pendingId === day.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">All breaks</h2>

        {breaks === null ? (
          <Spinner />
        ) : breaks.length === 0 ? (
          <EmptyState title="No breaks configured" />
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Doctor</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-500">Break</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breaks.map((brk) => (
                  <tr key={brk.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{brk.doctor?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{brk.date}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatWindow(brk.startTime, brk.endTime)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeBreak(brk)}
                        disabled={pendingId === brk.id}
                        className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {pendingId === brk.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
