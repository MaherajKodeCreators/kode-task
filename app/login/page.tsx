'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@/lib/validations'
import { apiPost } from '@/lib/api-client'
import type { SessionUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { InputField, PasswordField } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'

const PORTAL_COPY = {
  admin: { title: 'Admin sign in', subtitle: 'Access the admin portal.', role: 'ADMIN' as const },
  patient: { title: 'Patient sign in', subtitle: 'Access your patient portal.', role: 'PATIENT' as const },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formError, setFormError] = useState<string | null>(null)

  const portalParam = searchParams.get('as')
  const portal = portalParam === 'admin' || portalParam === 'patient' ? PORTAL_COPY[portalParam] : null

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginInput) {
    setFormError(null)
    const result = await apiPost<{ user: SessionUser }>('/api/auth/login', values)

    if (!result.success) {
      setFormError(result.message)
      return
    }

    if (portal && result.data.user.role !== portal.role) {
      setFormError(`This account isn't a ${portal.title.replace(' sign in', '').toLowerCase()} account.`)
      return
    }

    const next = searchParams.get('next')
    router.push(next ?? (result.data.user.role === 'ADMIN' ? '/admin' : '/patient'))
    router.refresh()
  }

  return (
    <Card className="w-full max-w-sm">
      {portal ? (
        <Link href="/" className="text-sm text-text-secondary hover:underline">
          ← Choose a different portal
        </Link>
      ) : null}
      <h1 className="mt-1 text-lg font-semibold text-text-primary">{portal?.title ?? 'Sign in'}</h1>
      <p className="mt-1 text-sm text-text-secondary">
        {portal?.subtitle ?? 'Access your patient or admin portal.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        {formError && <Alert kind="error">{formError}</Alert>}

        <InputField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {portal?.role !== 'ADMIN' && (
        <p className="mt-4 text-center text-sm text-text-secondary">
          New patient?{' '}
          <Link href="/register" className="font-medium text-text-primary hover:underline">
            Create an account
          </Link>
        </p>
      )}
    </Card>
  )
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-surface px-4 py-12">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  )
}
