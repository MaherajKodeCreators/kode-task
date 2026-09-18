import Link from 'next/link'
import { requireAdminPage } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card } from '@/components/ui/card'
import { todayUtc } from '@/lib/time'

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        <span className="text-lg font-semibold">{value}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
      </div>
    </Card>
  )
}

export default async function AdminIndexPage() {
  const user = await requireAdminPage()

  const [totalDoctors, activeDoctors, upcomingAppointments, availabilityWindows] = await Promise.all([
    prisma.doctor.count(),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.appointment.count({ where: { status: 'BOOKED', date: { gte: todayUtc() } } }),
    prisma.doctorAvailability.count({ where: { date: { gte: todayUtc() } } }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-text-primary">Welcome back, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-text-secondary">Here&apos;s what&apos;s happening across the clinic.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active doctors" value={activeDoctors} accent="bg-green-100 text-green-700" />
        <StatCard label="Total doctors" value={totalDoctors} accent="bg-surface-overlay text-text-primary" />
        <StatCard
          label="Upcoming appointments"
          value={upcomingAppointments}
          accent="bg-blue-100 text-blue-700"
        />
        <StatCard
          label="Open availability windows"
          value={availabilityWindows}
          accent="bg-amber-100 text-amber-700"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-text-primary">Doctors</h2>
          <p className="mt-1 text-sm text-text-secondary">Add, edit, or deactivate doctors on the roster.</p>
          <Link
            href="/admin/doctors"
            className="mt-4 inline-block text-sm font-medium text-text-primary hover:underline"
          >
            Manage doctors →
          </Link>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-text-primary">Availability</h2>
          <p className="mt-1 text-sm text-text-secondary">Set booking windows and record doctor breaks.</p>
          <Link
            href="/admin/availability"
            className="mt-4 inline-block text-sm font-medium text-text-primary hover:underline"
          >
            Manage availability →
          </Link>
        </Card>
      </div>
    </div>
  )
}
