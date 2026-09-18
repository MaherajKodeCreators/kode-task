import { prisma } from '@/lib/prisma'
import { requirePatientPage } from '@/lib/auth'
import { formatDateOnly, minutesToLabel, todayUtc } from '@/lib/time'
import { DoctorsGrid, type DoctorCard } from './doctors-grid'

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

  const cards: DoctorCard[] = doctors.map((doctor) => {
    const next = doctor.availabilities[0]
    return {
      id: doctor.id,
      name: doctor.name,
      specialization: doctor.specialization,
      next: next
        ? {
            date: formatDateOnly(next.date),
            startLabel: minutesToLabel(next.startMinutes),
            endLabel: minutesToLabel(next.endMinutes),
          }
        : null,
    }
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Available doctors</h1>
        <p className="mt-1 text-sm text-text-secondary">Select a doctor to see open appointment slots.</p>
      </div>

      <DoctorsGrid doctors={cards} />
    </div>
  )
}
