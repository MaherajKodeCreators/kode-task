'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { doctorCreateSchema, type DoctorCreateInput } from '@/lib/validations'
import { apiPatch, apiPost } from '@/lib/api-client'
import type { Doctor } from '@/types'
import { Button } from '@/components/ui/button'
import { InputField } from '@/components/ui/field'
import { Alert } from '@/components/ui/alert'

/** Create when `doctor` is undefined, otherwise update in place. */
export function DoctorForm({ doctor }: { doctor?: Doctor }) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DoctorCreateInput>({
    resolver: zodResolver(doctorCreateSchema),
    defaultValues: doctor
      ? {
          name: doctor.name,
          specialization: doctor.specialization,
          email: doctor.email ?? '',
          phone: doctor.phone ?? '',
        }
      : undefined,
  })

  async function onSubmit(values: DoctorCreateInput) {
    setFormError(null)

    const result = doctor
      ? await apiPatch<{ doctor: Doctor }>(`/api/doctors/${doctor.id}`, values)
      : await apiPost<{ doctor: Doctor }>('/api/doctors', values)

    if (!result.success) {
      setFormError(result.message)
      return
    }

    router.push('/admin/doctors')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {formError && <Alert kind="error">{formError}</Alert>}

      <InputField label="Name" error={errors.name?.message} {...register('name')} />
      <InputField
        label="Specialization"
        error={errors.specialization?.message}
        {...register('specialization')}
      />
      <InputField
        label="Email (optional)"
        type="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <InputField label="Phone (optional)" error={errors.phone?.message} {...register('phone')} />

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={isSubmitting}>
          {doctor ? 'Save changes' : 'Add doctor'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push('/admin/doctors')}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
