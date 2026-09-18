import Link from 'next/link'
import { DoctorForm } from '@/components/doctors/doctor-form'
import { Card } from '@/components/ui/card'

export default function NewDoctorPage() {
  return (
    <div className="space-y-4">
      <Link href="/admin/doctors" className="text-sm text-slate-500 hover:underline">
        ← Back to doctors
      </Link>
      <h1 className="text-lg font-semibold text-slate-900">Add doctor</h1>
      <Card className="max-w-lg">
        <DoctorForm />
      </Card>
    </div>
  )
}
