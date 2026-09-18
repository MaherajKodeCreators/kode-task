import { PrismaClient } from '@/app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 requires an explicit driver adapter; there is no built-in engine.
function createClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.')
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

// Reuse one client across hot reloads in development, otherwise every reload
// opens a new connection pool and the database runs out of connections.
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
