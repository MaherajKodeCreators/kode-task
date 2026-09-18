import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Card } from '@/components/ui/card'

const PORTAL_LINK_CLASSES =
  'flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors'

export default async function HomePage() {
  const user = await getCurrentUser()
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/patient')

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold text-slate-900">Welcome</h1>
        <p className="mt-1 text-sm text-slate-500">Choose how you&apos;d like to sign in.</p>

        <div className="mt-6 space-y-3">
          <Link
            href="/login?as=patient"
            className={`${PORTAL_LINK_CLASSES} bg-slate-900 text-white hover:bg-slate-700`}
          >
            Patient sign in
          </Link>
          <Link
            href="/login?as=admin"
            className={`${PORTAL_LINK_CLASSES} border border-slate-300 bg-white text-slate-900 hover:bg-slate-50`}
          >
            Admin sign in
          </Link>
        </div>
      </Card>
    </main>
  )
}
