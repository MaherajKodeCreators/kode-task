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
    <main className="flex min-h-screen flex-1 items-center justify-center bg-surface px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-lg font-semibold text-text-primary">Welcome</h1>
        <p className="mt-1 text-sm text-text-secondary">Choose how you&apos;d like to sign in.</p>

        <div className="mt-6 space-y-3">
          <Link
            href="/login?as=patient"
            className={`${PORTAL_LINK_CLASSES} bg-primary text-white hover:bg-primary/90`}
          >
            Patient sign in
          </Link>
          <Link
            href="/login?as=admin"
            className={`${PORTAL_LINK_CLASSES} border border-border-light bg-white text-text-primary hover:bg-surface`}
          >
            Admin sign in
          </Link>
        </div>
      </Card>
    </main>
  )
}
