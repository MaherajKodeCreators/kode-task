'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { apiDelete, apiGet, apiPatch } from '@/lib/api-client'
import type { Doctor } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, EmptyState } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { SkeletonRow } from '@/components/ui/skeleton'
import { FilterBar, SearchInput, StatusFilter } from '@/components/ui/filter-bar'
import { Pagination } from '@/components/ui/pagination'
import { DEFAULT_PAGE_SIZE, usePagination } from '@/lib/use-pagination'

export function DoctorsList() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('all')

  async function load() {
    setError(null)
    const result = await apiGet<{ doctors: Doctor[] }>('/api/doctors')
    if (!result.success) {
      setError(result.message)
      return
    }
    setDoctors(result.data.doctors)
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
    return () => {
      cancelled = true
    }
  }, [])

  async function toggleActive(doctor: Doctor) {
    setPendingId(doctor.id)
    setError(null)

    // Deactivating is a soft delete (DELETE, keeps history); reactivating is
    // a plain field update (PATCH isActive: true).
    const result = doctor.isActive
      ? await apiDelete<{ doctor: Doctor }>(`/api/doctors/${doctor.id}`)
      : await apiPatch<{ doctor: Doctor }>(`/api/doctors/${doctor.id}`, { isActive: true })

    setPendingId(null)
    if (!result.success) {
      setError(result.message)
      return
    }
    await load()
  }

  const filtered = useMemo(() => {
    if (!doctors) return []
    const q = search.trim().toLowerCase()
    return doctors.filter((doctor) => {
      const matchesQuery =
        !q ||
        doctor.name.toLowerCase().includes(q) ||
        doctor.specialization.toLowerCase().includes(q)
      const matchesStatus =
        status === 'all' || (status === 'active' ? doctor.isActive : !doctor.isActive)
      return matchesQuery && matchesStatus
    })
  }, [doctors, search, status])

  const { page, pageCount, pageItems, goToPage, resetPage } = usePagination(filtered)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-text-primary">Doctors</h1>
        <Link href="/admin/doctors/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Add doctor
          </Button>
        </Link>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {doctors && doctors.length > 0 && (
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              resetPage()
            }}
            placeholder="Search name or specialization…"
          />
          <StatusFilter
            value={status}
            onChange={(value) => {
              setStatus(value)
              resetPage()
            }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </FilterBar>
      )}

      {doctors && doctors.length === 0 && (
        <EmptyState title="No doctors yet" description="Add your first doctor to get started." />
      )}

      {doctors && doctors.length > 0 && filtered.length === 0 && (
        <EmptyState title="No matching doctors" description="Try a different search or filter." />
      )}

      {(doctors === null || pageItems.length > 0) && (
        <>
          {/* Table - desktop/tablet. Mobile gets a stacked card layout below. */}
          <div className="hidden overflow-hidden rounded-lg border border-border-light bg-white sm:block">
            <table className="min-w-full divide-y divide-border-light text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Specialization</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Contact</th>
                  <th className="px-4 py-2 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-2 text-right font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {doctors === null
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} columns={5} />)
                  : pageItems.map((doctor) => (
                      <tr key={doctor.id} className="hover:bg-surface">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold text-text-secondary">
                              {doctor.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="font-medium text-text-primary">{doctor.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">{doctor.specialization}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {doctor.email || doctor.phone || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill active={doctor.isActive} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/admin/doctors/${doctor.id}`}
                              className="rounded-md px-2 py-1 text-sm font-medium text-text-primary hover:bg-surface-overlay"
                            >
                              Edit
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleActive(doctor)}
                              loading={pendingId === doctor.id}
                              className={doctor.isActive ? 'text-red-600 hover:bg-red-50' : ''}
                            >
                              {pendingId === doctor.id
                                ? 'Saving…'
                                : doctor.isActive
                                  ? 'Deactivate'
                                  : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards - mobile only. */}
          <div className="space-y-3 sm:hidden">
            {doctors === null
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="h-24 animate-pulse bg-surface" />
                ))
              : pageItems.map((doctor) => (
                  <Card key={doctor.id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-xs font-semibold text-text-secondary">
                          {doctor.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-medium text-text-primary">{doctor.name}</p>
                          <p className="text-sm text-text-secondary">{doctor.specialization}</p>
                        </div>
                      </div>
                      <StatusPill active={doctor.isActive} />
                    </div>
                    {(doctor.email || doctor.phone) && (
                      <p className="text-sm text-text-secondary">{doctor.email || doctor.phone}</p>
                    )}
                    <div className="flex gap-2 border-t border-border-light pt-3">
                      <Link href={`/admin/doctors/${doctor.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(doctor)}
                        loading={pendingId === doctor.id}
                        className={`flex-1 ${doctor.isActive ? 'text-red-600 hover:bg-red-50' : ''}`}
                      >
                        {pendingId === doctor.id
                          ? 'Saving…'
                          : doctor.isActive
                            ? 'Deactivate'
                            : 'Activate'}
                      </Button>
                    </div>
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

      <Card className="bg-surface">
        <p className="text-xs text-text-secondary">
          Deactivating a doctor hides them from the patient portal without deleting their history.
        </p>
      </Card>
    </div>
  )
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        active ? 'bg-green-100 text-green-800' : 'bg-surface-overlay text-text-secondary'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
