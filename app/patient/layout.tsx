import { requirePatientPage } from '@/lib/auth'
import { PortalNav } from '@/components/portal-nav'

const LINKS = [
  { href: '/patient/doctors', label: 'Doctors' },
  { href: '/patient/appointments', label: 'My appointments' },
]

export default async function PatientLayout({ children }: LayoutProps<'/patient'>) {
  const user = await requirePatientPage()

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <PortalNav title="Patient Portal" links={LINKS} userName={user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
