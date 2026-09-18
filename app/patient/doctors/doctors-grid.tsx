'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card, EmptyState } from '@/components/ui/card'
import { FilterBar, SearchInput } from '@/components/ui/filter-bar'
import { Pagination } from '@/components/ui/pagination'
import { DEFAULT_PAGE_SIZE, usePagination } from '@/lib/use-pagination'

export type DoctorCard = {
  id: string
  name: string
  specialization: string
  next: { date: string; startLabel: string; endLabel: string } | null
}

export function DoctorsGrid({ doctors }: { doctors: DoctorCard[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return doctors
    return doctors.filter(
      (doctor) =>
        doctor.name.toLowerCase().includes(q) || doctor.specialization.toLowerCase().includes(q)
    )
  }, [doctors, search])

  const { page, pageCount, pageItems, goToPage, resetPage } = usePagination(filtered)

  if (doctors.length === 0) {
    return (
      <EmptyState
        title="No doctors available"
        description="Please check back later — an administrator has not added any doctors yet."
      />
    )
  }

  return (
    <div className="space-y-4">
      <FilterBar>
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            resetPage()
          }}
          placeholder="Search name or specialization…"
        />
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="No matching doctors" description="Try a different search." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {pageItems.map((doctor) => (
              <Card key={doctor.id} className="flex flex-col justify-between">
                <div>
                  <h2 className="font-medium text-text-primary">{doctor.name}</h2>
                  <p className="text-sm text-text-secondary">{doctor.specialization}</p>

                  <p className="mt-3 text-sm text-text-secondary">
                    {doctor.next ? (
                      <>
                        Next available{' '}
                        <span className="font-medium text-text-primary">{doctor.next.date}</span>{' '}
                        · {doctor.next.startLabel} – {doctor.next.endLabel}
                      </>
                    ) : (
                      <span className="text-text-secondary">No upcoming availability</span>
                    )}
                  </p>
                </div>

                <Link
                  href={`/patient/doctors/${doctor.id}`}
                  className="mt-4 inline-flex w-fit rounded-full bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  View slots
                </Link>
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
