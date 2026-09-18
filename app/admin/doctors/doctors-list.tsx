'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { apiDelete, apiGet, apiPatch } from '@/lib/api-client'
import type { Doctor } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, EmptyState } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { SkeletonRow } from '@/components/ui/skeleton'

export function DoctorsList() {
  const [doctors, setDoctors] = useState<Doctor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Doctors</h1>
        <Link href="/admin/doctors/new">
          <Button>
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Add doctor
          </Button>
        </Link>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {doctors && doctors.length === 0 && (
        <EmptyState title="No doctors yet" description="Add your first doctor to get started." />
      )}

      {(doctors === null || doctors.length > 0) && (
        <div className="overflow-hidden rounded-lg border border-border-light bg-white">
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
                : doctors.map((doctor) => (
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
                  <td className="px-4 py-3 text-text-secondary">{doctor.email || doctor.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        doctor.isActive ? 'bg-green-100 text-green-800' : 'bg-surface-overlay text-text-secondary'
                      }`}
                    >
                      {doctor.isActive ? 'Active' : 'Inactive'}
                    </span>
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
      )}

      <Card className="bg-surface">
        <p className="text-xs text-text-secondary">
          Deactivating a doctor hides them from the patient portal without deleting their history.
        </p>
      </Card>
    </div>
  )
}
