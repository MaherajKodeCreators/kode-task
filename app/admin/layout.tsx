import { requireAdminPage } from '@/lib/auth'
import { PortalNav } from '@/components/portal-nav'

const LINKS = [
  { href: '/admin/doctors', label: 'Doctors' },
  { href: '/admin/availability', label: 'Availability' },
]

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  const user = await requireAdminPage()

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PortalNav title="Admin Portal" links={LINKS} userName={user.name} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  )
}
