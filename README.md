# Appointment Booking System

A simple appointment booking system with two portals — **Admin** and
**Patient** — built as a single full-stack Next.js application.

## 1. Overview

- Admins manage doctors and set each doctor's daily availability.
- Patients register, log in, browse doctors, and book/cancel appointments.
- One Next.js app serves both the UI and the API — no separate backend.

## 2. Tech stack

- Next.js 16 (App Router, Route Handlers)
- React 19, TypeScript
- Tailwind CSS 4
- PostgreSQL + Prisma ORM 7
- Zod for validation
- React Hook Form for form state
- bcryptjs for password hashing
- Signed, HTTP-only cookie sessions (no external auth library)

## 3. Requirements

- Node.js 20+
- A PostgreSQL database (tested against Supabase Postgres 17)

## 4. PostgreSQL setup

Use any Postgres instance (local, Docker, or a hosted provider like Supabase
or Railway). You need a connection string in the standard form:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

If the password contains special characters, percent-encode them:
`/` → `%2F`, `+` → `%2B`, `%` → `%25`, `,` → `%2C`, `@` → `%40`, `:` → `%3A`.

## 5. Environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable         | Purpose                                              |
| ---------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string                             |
| `SESSION_SECRET` | Random secret used to sign session cookies (HMAC-SHA256). Generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL`    | Seeded admin login email                                |
| `ADMIN_PASSWORD` | Seeded admin login password                             |

`.env` is git-ignored. `.env.example` documents the shape only, with no real
secrets.

## 6. Prisma setup

This project uses **Prisma 7**, which has two changes from earlier Prisma
versions worth knowing about:

- The datasource URL lives in `prisma7.config.ts` (which reads
  `process.env.DATABASE_URL` via `dotenv`), not in `prisma/schema.prisma`.
- `PrismaClient` requires an explicit driver adapter — see
  [lib/prisma.ts](lib/prisma.ts), which uses `@prisma/adapter-pg`.

Install dependencies (this also runs `prisma generate` via `postinstall`):

```bash
npm install
```

## 7. Migration commands

```bash
npm run db:migrate    # apply migrations in development (prisma migrate dev)
npm run db:deploy     # apply migrations in production (prisma migrate deploy)
npm run db:generate   # regenerate the Prisma client
```

The initial migration
([prisma/migrations/20260918061859_init/migration.sql](prisma/migrations/20260918061859_init/migration.sql))
creates all four tables and adds a **partial unique index**:

```sql
CREATE UNIQUE INDEX "appointments_active_slot_key"
  ON "appointments" ("doctorId", "date", "startMinutes")
  WHERE "status" = 'BOOKED';
```

This is what makes double-booking impossible at the database level (see
§12 below).

## 8. Seed command

```bash
npm run db:seed
```

Creates (idempotently — safe to re-run):

- The admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Three sample doctors, each with 5 days of 09:00–17:00 availability.

## 9. Development command

```bash
npm run dev
```

Visit `http://localhost:3000`. It redirects to `/login`.

Other useful scripts: `npm run build`, `npm run typecheck`, `npm run lint`,
`npm run db:studio` (Prisma Studio, a GUI for the database).

## 10. Admin test credentials

```
Email:    admin@example.com
Password: Admin@123
```

(Configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before seeding.)
Never hardcoded in application code — only used by the seed script.

## 11. Main API routes

All responses use one envelope shape:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "message": "...", "errors": { "field": ["..."] } }
```

| Method | Route                              | Access        | Purpose                              |
| ------ | ----------------------------------- | ------------- | -------------------------------------- |
| POST   | `/api/auth/register`               | Public        | Create a patient account, signs in     |
| POST   | `/api/auth/login`                  | Public        | Sign in                                |
| POST   | `/api/auth/logout`                 | Signed in     | Clear the session cookie               |
| GET    | `/api/auth/me`                     | Public        | Current session user, or `null`        |
| GET    | `/api/doctors`                     | Signed in     | List doctors (active-only for patients) |
| POST   | `/api/doctors`                     | Admin         | Create a doctor                        |
| GET    | `/api/doctors/[id]`                | Signed in     | Doctor detail                          |
| PATCH  | `/api/doctors/[id]`                | Admin         | Update a doctor                        |
| DELETE | `/api/doctors/[id]`                | Admin         | Deactivate (or `?hard=true` to delete) |
| GET    | `/api/doctors/[id]/availability`   | Signed in     | Upcoming days, or free slots for `?date=` |
| GET    | `/api/availability`                | Admin         | All doctors' availability (filterable) |
| POST   | `/api/availability`                | Admin         | Create/update a doctor's day window    |
| DELETE | `/api/availability`                | Admin         | Remove a day's availability             |
| GET    | `/api/appointments`                | Patient       | The signed-in patient's own appointments |
| POST   | `/api/appointments`                | Patient       | Book a slot                             |
| GET    | `/api/appointments/[id]`           | Patient (own) | Appointment detail                      |
| PATCH  | `/api/appointments/[id]/cancel`    | Patient (own) | Cancel an appointment                   |

## 12. Appointment booking logic / assumptions

- **Slot length:** fixed 30 minutes, generated on a grid starting at the
  doctor's availability `startTime`. A slot is only offered if it fits
  entirely before `endTime` (see [lib/time.ts](lib/time.ts)).
- **One availability window per doctor per day**, enforced by a
  `@@unique([doctorId, date])` constraint on `DoctorAvailability`.
- **Only free slots are ever shown.** A slot is hidden once a `BOOKED`
  appointment exists for that doctor/date/start time. `CANCELLED`
  appointments are ignored when computing free slots, so cancelling
  immediately releases the slot.
- **Double-booking is prevented at the database level**, not just in
  application code. The partial unique index
  `(doctorId, date, startMinutes) WHERE status = 'BOOKED'` means Postgres
  itself rejects a second `BOOKED` row for the same doctor/date/time. Two
  concurrent booking requests both pass the application-level "is it free?"
  check, then race to `INSERT`; exactly one succeeds, the other receives a
  Prisma `P2002` unique-constraint error, which the API turns into a clean
  `409 Sorry, that slot was just booked`. This was verified with 5
  concurrent requests for the same slot — exactly 1 succeeded.
- **Authorization is layered:**
  - `proxy.ts` (Next 16's renamed `middleware.ts`) does an *optimistic*
    cookie check to keep signed-out users off `/admin` and `/patient` pages
    without a database round trip.
  - Every API route and server page independently re-verifies the session
    against the database via the Data Access Layer
    ([lib/auth.ts](lib/auth.ts)) — the proxy alone is never trusted as the
    real authorization boundary.
  - Patients can only ever read/cancel their **own** appointments — every
    query is scoped by `patientId` from the session, not from client input.
- **Times are stored as integer minutes-from-midnight**, not as `DateTime`
  time values, so slot math is exact integer arithmetic with no timezone
  drift. Dates are stored as UTC-midnight `date` columns.
- **Passwords** are hashed with bcrypt (cost 10) and never stored or logged
  in plain text. Sessions are a signed (HMAC-SHA256), HTTP-only, `SameSite=Lax`
  cookie — never `localStorage`.

## Project structure

```
app/
  login/, register/            - auth pages
  admin/                       - admin portal (doctors, availability)
  patient/                     - patient portal (doctors, booking, appointments)
  api/                         - route handlers (auth, doctors, availability, appointments)
components/
  ui/                          - shared primitives (button, field, card, alert)
  doctors/                     - doctor form
lib/
  prisma.ts, auth.ts, session.ts, validations.ts, api.ts, api-client.ts, time.ts
prisma/
  schema.prisma, seed.ts, migrations/
proxy.ts                       - Next 16 proxy (auth gate for portal routes)
```

## Notes on scope

Deliberately excluded, per the task's "do not over-engineer" guidance:
payments, notifications/email, calendar integrations, WebSockets,
microservices, and a state-management library (React state is sufficient
here).
