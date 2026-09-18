'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { apiPost } from '@/lib/api-client'
import type { SessionUser } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { InputField, PasswordField } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  async function onSubmit(values: RegisterInput) {
    setFormError(null)
    const result = await apiPost<{ user: SessionUser }>('/api/auth/register', values)

    if (!result.success) {
      // Surface a duplicate email on the field itself.
      if (result.message.toLowerCase().includes('already registered')) {
        setError('email', { message: result.message })
      } else {
        setFormError(result.message)
      }
      return
    }

    router.push('/patient')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">Register as a patient to book appointments.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          {formError && <Alert kind="error">{formError}</Alert>}

          <InputField
            label="Full name"
            autoComplete="name"
            error={errors.name?.message}
            {...register('name')}
          />
          <InputField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <PasswordField
            label="Password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-slate-900 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  )
}
