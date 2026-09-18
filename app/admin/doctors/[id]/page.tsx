import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { requireAdminPage } from '@/lib/auth'
import { DoctorForm } from '@/components/doctors/doctor-form'
import { Card } from '@/components/ui/card'

export default async function EditDoctorPage({ params }: PageProps<'/admin/doctors/[id]'>) {
  // Layout already guards this route; re-checking here keeps the data access
  // itself authorized rather than trusting the layout.
  await requireAdminPage()

  const { id } = await params
  const doctor = await prisma.doctor.findUnique({ where: { id } })
  if (!doctor) notFound()

  return (
    <div className="space-y-4">
      <Link href="/admin/doctors" className="text-sm text-slate-500 hover:underline">
        ← Back to doctors
      </Link>
      <h1 className="text-lg font-semibold text-slate-900">Edit doctor</h1>
      <Card className="max-w-lg">
        <DoctorForm
          doctor={{
            id: doctor.id,
            name: doctor.name,
            specialization: doctor.specialization,
            email: doctor.email,
            phone: doctor.phone,
            isActive: doctor.isActive,
          }}
        />
      </Card>
    </div>
  )
}
