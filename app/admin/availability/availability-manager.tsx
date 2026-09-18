'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { availabilitySchema, breakSchema, type AvailabilityInput, type BreakInput } from '@/lib/validations'
import { apiDelete, apiGet, apiPost } from '@/lib/api-client'
import type { AvailabilityDay, Doctor, DoctorBreak } from '@/types'
import { Button } from '@/components/ui/button'
import { InputField, SelectField } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import { Card, EmptyState } from '@/components/ui/card'
import { SkeletonRow } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/filter-bar'
import { Pagination } from '@/components/ui/pagination'
import { Modal } from '@/components/ui/modal'
import { DEFAULT_PAGE_SIZE, usePagination } from '@/lib/use-pagination'
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
  const [windowModalOpen, setWindowModalOpen] = useState(false)
  const [breakModalOpen, setBreakModalOpen] = useState(false)

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
    availabilityForm.reset({ startTime: '09:00', endTime: '13:00' })
    setWindowModalOpen(false)
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
    breakForm.reset()
    setBreakModalOpen(false)
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

  const noActiveDoctors = doctors !== null && activeDoctors.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Doctor availability</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setBreakModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0 translate-y-px" strokeWidth={2.5} aria-hidden />
            Add break
          </Button>
          <Button onClick={() => setWindowModalOpen(true)}>
            <Plus className="h-4 w-4 shrink-0 translate-y-px" strokeWidth={2.5} aria-hidden />
            Add window
          </Button>
        </div>
      </div>

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

      <WindowsTable days={days} pendingId={pendingId} onRemove={removeDay} />
      <BreaksTable breaks={breaks} pendingId={pendingId} onRemove={removeBreak} />

      <Modal
        open={windowModalOpen}
        onClose={() => setWindowModalOpen(false)}
        title="Add availability window"
        description="A doctor can have several windows per day for split hours (e.g. 9–1 and 2–5). New windows must not overlap existing ones."
      >
        {noActiveDoctors ? (
          <EmptyState
            title="No active doctors"
            description="Add or activate a doctor before setting availability."
          />
        ) : (
          <form
            onSubmit={availabilityForm.handleSubmit(onSubmitAvailability)}
            className="space-y-4"
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setWindowModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={availabilityForm.formState.isSubmitting}>
                Add window
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={breakModalOpen}
        onClose={() => setBreakModalOpen(false)}
        title="Add a doctor break"
        description="If a booked appointment falls inside the break, it is automatically moved to the nearest free slot that day."
      >
        {noActiveDoctors ? (
          <EmptyState title="No active doctors" />
        ) : (
          <form onSubmit={breakForm.handleSubmit(onSubmitBreak)} className="space-y-4" noValidate>
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setBreakModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={breakForm.formState.isSubmitting}>
                Add break
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}

function WindowsTable({
  days,
  pendingId,
  onRemove,
}: {
  days: AvailabilityDay[] | null
  pendingId: string | null
  onRemove: (day: AvailabilityDay) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!days) return []
    const q = search.trim().toLowerCase()
    if (!q) return days
    return days.filter(
      (day) =>
        day.doctor?.name.toLowerCase().includes(q) ||
        day.doctor?.specialization.toLowerCase().includes(q)
    )
  }, [days, search])

  const { page, pageCount, pageItems, goToPage, resetPage } = usePagination(filtered)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">All availability windows</h2>
        {days && days.length > 0 && (
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              resetPage()
            }}
            placeholder="Search doctor…"
          />
        )}
      </div>

      {days !== null && days.length === 0 && <EmptyState title="No availability configured yet" />}
      {days !== null && days.length > 0 && filtered.length === 0 && (
        <EmptyState title="No matching windows" description="Try a different search." />
      )}

      {(days === null || pageItems.length > 0) && (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border-light bg-white sm:block">
            <table className="min-w-full divide-y divide-border-light text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Doctor</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Window</th>
                  <th className="px-4 py-2 text-right font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {days === null
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} columns={4} />)
                  : pageItems.map((day) => (
                      <tr key={day.id} className="hover:bg-surface">
                        <td className="px-4 py-3">
                          <span className="font-medium text-text-primary">{day.doctor?.name}</span>
                          <span className="block text-xs text-text-secondary">
                            {day.doctor?.specialization}
                            {day.doctor && !day.doctor.isActive && ' · inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{day.date}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatWindow(day.startTime, day.endTime)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(day)}
                            loading={pendingId === day.id}
                            className="text-red-600 hover:bg-red-50"
                          >
                            {pendingId === day.id ? 'Removing…' : 'Remove'}
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 sm:hidden">
            {days === null
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="h-20 animate-pulse bg-surface" />
                ))
              : pageItems.map((day) => (
                  <Card key={day.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{day.doctor?.name}</p>
                      <p className="text-xs text-text-secondary">
                        {day.doctor?.specialization}
                        {day.doctor && !day.doctor.isActive && ' · inactive'}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {day.date} · {formatWindow(day.startTime, day.endTime)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(day)}
                      loading={pendingId === day.id}
                      className="shrink-0 text-red-600 hover:bg-red-50"
                    >
                      {pendingId === day.id ? '…' : 'Remove'}
                    </Button>
                  </Card>
                ))}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={goToPage}
            totalItems={filtered.length}
            pageSize={DEFAULT_PAGE_SIZE}
          />
        </>
      )}
    </div>
  )
}

function BreaksTable({
  breaks,
  pendingId,
  onRemove,
}: {
  breaks: DoctorBreak[] | null
  pendingId: string | null
  onRemove: (brk: DoctorBreak) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!breaks) return []
    const q = search.trim().toLowerCase()
    if (!q) return breaks
    return breaks.filter(
      (brk) =>
        brk.doctor?.name.toLowerCase().includes(q) ||
        brk.doctor?.specialization.toLowerCase().includes(q)
    )
  }, [breaks, search])

  const { page, pageCount, pageItems, goToPage, resetPage } = usePagination(filtered)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-primary">All breaks</h2>
        {breaks && breaks.length > 0 && (
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              resetPage()
            }}
            placeholder="Search doctor…"
          />
        )}
      </div>

      {breaks !== null && breaks.length === 0 && <EmptyState title="No breaks configured" />}
      {breaks !== null && breaks.length > 0 && filtered.length === 0 && (
        <EmptyState title="No matching breaks" description="Try a different search." />
      )}

      {(breaks === null || pageItems.length > 0) && (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border-light bg-white sm:block">
            <table className="min-w-full divide-y divide-border-light text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Doctor</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Break</th>
                  <th className="px-4 py-2 text-right font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {breaks === null
                  ? Array.from({ length: 2 }).map((_, i) => <SkeletonRow key={i} columns={4} />)
                  : pageItems.map((brk) => (
                      <tr key={brk.id} className="hover:bg-surface">
                        <td className="px-4 py-3 font-medium text-text-primary">{brk.doctor?.name}</td>
                        <td className="px-4 py-3 text-text-secondary">{brk.date}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatWindow(brk.startTime, brk.endTime)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(brk)}
                            loading={pendingId === brk.id}
                            className="text-red-600 hover:bg-red-50"
                          >
                            {pendingId === brk.id ? 'Removing…' : 'Remove'}
                          </Button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 sm:hidden">
            {breaks === null
              ? Array.from({ length: 2 }).map((_, i) => (
                  <Card key={i} className="h-20 animate-pulse bg-surface" />
                ))
              : pageItems.map((brk) => (
                  <Card key={brk.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{brk.doctor?.name}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {brk.date} · {formatWindow(brk.startTime, brk.endTime)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(brk)}
                      loading={pendingId === brk.id}
                      className="shrink-0 text-red-600 hover:bg-red-50"
                    >
                      {pendingId === brk.id ? '…' : 'Remove'}
                    </Button>
                  </Card>
                ))}
          </div>

          <Pagination
            page={page}
            pageCount={pageCount}
            onChange={goToPage}
            totalItems={filtered.length}
            pageSize={DEFAULT_PAGE_SIZE}
          />
        </>
      )}
    </div>
  )
}
