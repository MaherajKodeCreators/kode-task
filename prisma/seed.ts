import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { hashPassword } from '../lib/auth'
import { formatDateOnly, parseDateOnly, todayUtc } from '../lib/time'

/**
 * Seeds the admin account plus sample doctors and availability.
 * Idempotent: safe to run repeatedly.
 */
async function main() {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase()
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@123'

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Administrator',
      email,
      passwordHash: await hashPassword(password),
      role: 'ADMIN',
    },
  })
  console.log(`Admin ready: ${admin.email}`)

  const doctors = [
    { name: 'Dr. Asha Menon', specialization: 'Cardiology', email: 'asha@example.com' },
    { name: 'Dr. Rahul Verma', specialization: 'Dermatology', email: 'rahul@example.com' },
    { name: 'Dr. Priya Nair', specialization: 'Pediatrics', email: 'priya@example.com' },
  ]

  for (const doctor of doctors) {
    const existing = await prisma.doctor.findFirst({ where: { name: doctor.name } })
    const record =
      existing ??
      (await prisma.doctor.create({ data: { ...doctor, isActive: true } }))

    // Split-hours availability for the next 5 days: 09:00-13:00 and 14:00-17:00.
    const base = todayUtc()
    for (let offset = 0; offset < 5; offset += 1) {
      const date = parseDateOnly(
        formatDateOnly(new Date(base.getTime() + offset * 86_400_000))
      )!

      const existing = await prisma.doctorAvailability.findMany({
        where: { doctorId: record.id, date },
      })
      if (existing.length === 0) {
        await prisma.doctorAvailability.createMany({
          data: [
            { doctorId: record.id, date, startMinutes: 9 * 60, endMinutes: 13 * 60 },
            { doctorId: record.id, date, startMinutes: 14 * 60, endMinutes: 17 * 60 },
          ],
        })
      }
    }
    console.log(`Doctor ready: ${record.name} (5 days of availability)`)
  }

  console.log('\nSeed complete.')
  console.log(`  Admin login: ${email} / ${password}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
