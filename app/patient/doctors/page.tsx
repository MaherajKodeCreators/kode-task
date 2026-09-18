import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { requirePatientPage } from '@/lib/auth'
import { formatDateOnly, minutesToLabel, todayUtc } from '@/lib/time'
import { Card, EmptyState } from '@/components/ui/card'

export default async function PatientDoctorsPage() {
  await requirePatientPage()

  // Only active doctors are visible to patients.
  const doctors = await prisma.doctor.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      availabilities: {
        where: { date: { gte: todayUtc() } },
        orderBy: { date: 'asc' },
        take: 1,
      },
    },
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Available doctors</h1>
        <p className="mt-1 text-sm text-slate-500">Select a doctor to see open appointment slots.</p>
      </div>

      {doctors.length === 0 ? (
        <EmptyState
          title="No doctors available"
          description="Please check back later — an administrator has not added any doctors yet."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {doctors.map((doctor) => {
            const next = doctor.availabilities[0]
            return (
              <Card key={doctor.id} className="flex flex-col justify-between">
                <div>
                  <h2 className="font-medium text-slate-900">{doctor.name}</h2>
                  <p className="text-sm text-slate-500">{doctor.specialization}</p>

                  <p className="mt-3 text-sm text-slate-600">
                    {next ? (
                      <>
                        Next available{' '}
                        <span className="font-medium text-slate-900">
                          {formatDateOnly(next.date)}
                        </span>{' '}
                        · {minutesToLabel(next.startMinutes)} – {minutesToLabel(next.endMinutes)}
                      </>
                    ) : (
                      <span className="text-slate-400">No upcoming availability</span>
                    )}
                  </p>
                </div>

                <Link
                  href={`/patient/doctors/${doctor.id}`}
                  className="mt-4 inline-flex w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                >
                  View slots
                </Link>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
