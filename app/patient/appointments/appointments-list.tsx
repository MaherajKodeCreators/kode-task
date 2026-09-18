'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiPatch } from '@/lib/api-client'
import type { Appointment } from '@/types'
import { Alert } from '@/components/ui/alert'
import { Card, EmptyState, StatusBadge } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/ui/skeleton'
import { FilterBar, SearchInput, StatusFilter } from '@/components/ui/filter-bar'
import { Pagination } from '@/components/ui/pagination'
import { DEFAULT_PAGE_SIZE, usePagination } from '@/lib/use-pagination'

export function AppointmentsList() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'BOOKED' | 'CANCELLED' | 'all'>('all')

  async function load() {
    const result = await apiGet<{ appointments: Appointment[] }>('/api/appointments')
    if (!result.success) {
      setError(result.message)
      return
    }
    setAppointments(result.data.appointments)
  }

  // Fetch on mount. `cancelled` stops a slow response from setting state
  // after the component has unmounted.
  useEffect(() => {
    let cancelled = false
    apiGet<{ appointments: Appointment[] }>('/api/appointments').then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.message)
        return
      }
      setAppointments(result.data.appointments)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function cancel(appointment: Appointment) {
    const confirmed = window.confirm(
      `Cancel your ${appointment.date} appointment with ${appointment.doctor.name}?`
    )
    if (!confirmed) return

    setError(null)
    setSuccess(null)
    setPendingId(appointment.id)

    const result = await apiPatch<{ message: string }>(
      `/api/appointments/${appointment.id}/cancel`
    )

    setPendingId(null)
    if (!result.success) {
      setError(result.message)
      return
    }

    setSuccess(result.data.message)
    await load()
  }

  const filtered = useMemo(() => {
    if (!appointments) return []
    const q = search.trim().toLowerCase()
    return appointments.filter((appointment) => {
      const matchesQuery =
        !q ||
        appointment.doctor.name.toLowerCase().includes(q) ||
        appointment.doctor.specialization.toLowerCase().includes(q)
      const matchesStatus = status === 'all' || appointment.status === status
      return matchesQuery && matchesStatus
    })
  }, [appointments, search, status])

  const { page, pageCount, pageItems, goToPage, resetPage } = usePagination(filtered)

  if (appointments === null && !error) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-text-primary">My appointments</h1>
        <section className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-text-primary">My appointments</h1>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      {appointments && appointments.length > 0 && (
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              resetPage()
            }}
            placeholder="Search doctor or specialization…"
          />
          <StatusFilter
            value={status}
            onChange={(value) => {
              setStatus(value)
              resetPage()
            }}
            options={[
              { value: 'BOOKED', label: 'Booked' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </FilterBar>
      )}

      {appointments && appointments.length === 0 && (
        <EmptyState
          title="No appointments yet"
          description="Choose a doctor to book your first appointment."
        />
      )}

      {appointments && appointments.length > 0 && filtered.length === 0 && (
        <EmptyState title="No matching appointments" description="Try a different search or filter." />
      )}

      <section className="space-y-3">
        {pageItems.map((appointment) => (
          <Card
            key={appointment.id}
            className={`flex flex-wrap items-center justify-between gap-3 ${
              appointment.status === 'CANCELLED' ? 'opacity-75' : ''
            }`}
          >
            <div>
              <p className="font-medium text-text-primary">{appointment.doctor.name}</p>
              <p className="text-sm text-text-secondary">{appointment.doctor.specialization}</p>
              <p className="mt-1 text-sm text-text-secondary">
                {appointment.date} · {appointment.label}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={appointment.status} />
              {appointment.status === 'BOOKED' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => cancel(appointment)}
                  loading={pendingId === appointment.id}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {pendingId === appointment.id ? 'Cancelling…' : 'Cancel'}
                </Button>
              )}
            </div>
          </Card>
        ))}
      </section>

      <Pagination
        page={page}
        pageCount={pageCount}
        onChange={goToPage}
        totalItems={filtered.length}
        pageSize={DEFAULT_PAGE_SIZE}
      />

      <Link href="/patient/doctors" className="inline-block text-sm text-text-secondary hover:underline">
        ← Book another appointment
      </Link>
    </div>
  )
}
