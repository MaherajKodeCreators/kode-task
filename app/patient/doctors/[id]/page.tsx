import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requirePatientPage } from '@/lib/auth'
import { formatDateOnly, todayUtc } from '@/lib/time'
import { BookingPanel } from './booking-panel'

export default async function PatientDoctorPage({ params }: PageProps<'/patient/doctors/[id]'>) {
  await requirePatientPage()

  const { id } = await params

  const doctor = await prisma.doctor.findUnique({
    where: { id },
    include: {
      availabilities: {
        where: { date: { gte: todayUtc() } },
        orderBy: { date: 'asc' },
        take: 30,
      },
    },
  })

  // Inactive doctors are invisible to patients.
  if (!doctor || !doctor.isActive) notFound()

  // A day can have several split-hours windows, so dedupe to one entry per date.
  const availableDates = Array.from(
    new Set(doctor.availabilities.map((day) => formatDateOnly(day.date)))
  )

  return (
    <div className="space-y-4">
      <Link href="/patient/doctors" className="text-sm text-text-secondary hover:underline">
        ← Back to doctors
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-text-primary">{doctor.name}</h1>
        <p className="text-sm text-text-secondary">{doctor.specialization}</p>
      </div>

      <BookingPanel doctorId={doctor.id} availableDates={availableDates} />
    </div>
  )
}
