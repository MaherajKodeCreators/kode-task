# Appointment Booking System

A simple appointment booking system with two portals — **Admin** and
**Patient** — built as a single full-stack Next.js application.

See also [FRONTEND.md](FRONTEND.md) for a UI/portal-focused walkthrough.

## 1. Overview

- Admins manage doctors, set availability (including **split working
  hours** — multiple windows per day), and add doctor **breaks**.
- Patients register, log in, browse doctors, and book/cancel appointments.
- If a break is added over an already-booked appointment, that appointment
  is **automatically rescheduled** to the nearest free slot the same day.
- One Next.js app serves both the UI and the API — no separate backend.

## 2. Tech stack

- Next.js 16 (App Router, Route Handlers, Proxy)
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

**On Supabase specifically:** the direct connection host
(`db.<project-ref>.supabase.co`) is **IPv6-only**. It works fine from a
machine with IPv6 egress (most laptops), but **serverless platforms like
Vercel are IPv4-only** and cannot reach it — you'll get
`P1001: Can't reach database server`. Use the **Session pooler** connection
string instead (Supabase dashboard → Connect → Session pooler), which is
IPv4-compatible and works everywhere:

```
postgresql://postgres.<project-ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
```

Use the session pooler (not the transaction pooler) — Prisma migrations
need session-level features (advisory locks, prepared statements) that the
transaction pooler doesn't support. One `DATABASE_URL` covers both local dev
and deployment this way.

## 5. Environment variables

```bash
cp .env.example .env
```

Then fill in `.env`:

| Variable         | Purpose                                              |
| ---------------- | ----------------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string (see §4)                     |
| `SESSION_SECRET` | Random secret used to sign session cookies (HMAC-SHA256). Generate with `openssl rand -base64 32` |
| `ADMIN_EMAIL`    | Seeded admin login email                                |
| `ADMIN_PASSWORD` | Seeded admin login password                             |

`.env` is git-ignored and must **never** be committed. `.env.example`
documents the shape only, with no real secrets. When deploying, set these
same variables in your host's environment variable settings (e.g. Vercel
Project Settings → Environment Variables) — not in a file, and not in git.

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

Migrations (`prisma/migrations/`), in order:

1. `..._init` — creates `users`, `doctors`, `doctor_availabilities`,
   `appointments`, plus a **partial unique index** that prevents
   double-booking at the database level:
   ```sql
   CREATE UNIQUE INDEX "appointments_active_slot_key"
     ON "appointments" ("doctorId", "date", "startMinutes")
     WHERE "status" = 'BOOKED';
   ```
2. `..._split_hours_and_breaks` — drops the old "one availability window per
   day" constraint (a doctor can now have several windows for split hours)
   and adds `doctor_breaks`.

On a **hosted deploy** (Vercel, etc.), run `npm run db:deploy` as part of
your build/release step so the production database schema stays in sync —
Vercel does not run migrations automatically.

## 8. Seed command

```bash
npm run db:seed
```

Creates (idempotently — safe to re-run):

- The admin account from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Three sample doctors, each with split-hours availability
  (09:00–13:00 and 14:00–17:00) for the next 5 days.

## 9. Development command

```bash
npm run dev
```

Visit `http://localhost:3000`. It redirects to `/login`.

Other useful scripts: `npm run build`, `npm run typecheck`, `npm run lint`,
`npm run db:studio` (Prisma Studio, a GUI for the database).

## 10. Admin credentials

**Development/test credentials only** — seeded by `npm run db:seed`, not
hardcoded anywhere in application code:

```
Email:    admin@example.com
Password: Admin@123
```

Configurable before seeding via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`.
For a real deployment, set those two variables to something private in your
host's environment settings before the first seed run, and don't reuse the
defaults above.

There is no seeded patient account — register one at `/register` with any
email and an 8+ character password.

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
| GET    | `/api/availability`                | Admin         | All doctors' availability windows (filterable) |
| POST   | `/api/availability`                | Admin         | Add an availability window for a day   |
| DELETE | `/api/availability?id=`            | Admin         | Remove one availability window         |
| GET    | `/api/breaks`                      | Admin         | All doctor breaks (filterable)         |
| POST   | `/api/breaks`                      | Admin         | Add a break; auto-reschedules any affected booked appointment |
| DELETE | `/api/breaks?id=`                  | Admin         | Remove a break                         |
| GET    | `/api/appointments`                | Patient       | The signed-in patient's own appointments |
| POST   | `/api/appointments`                | Patient       | Book a slot                             |
| GET    | `/api/appointments/[id]`           | Patient (own) | Appointment detail                      |
| PATCH  | `/api/appointments/[id]/cancel`    | Patient (own) | Cancel an appointment                   |

## 12. Appointment booking logic / assumptions

- **Slot length:** fixed 30 minutes, generated on a grid starting at each
  availability window's start time. A slot is only offered if it fits
  entirely before the window's end time (see [lib/time.ts](lib/time.ts)).
- **Split working hours:** a doctor can have several availability windows on
  the same day (e.g. 9–1 and 2–5). Slots are generated per window; the gap
  between windows is never a bookable slot. New windows must not overlap
  existing ones for that doctor/day.
- **Doctor breaks:** a break sits inside a window and blocks that time from
  new bookings. Adding a break that overlaps an already-`BOOKED`
  appointment automatically moves that appointment to the nearest free slot
  the same day (by minute-distance from its original time, never into the
  past). If no free slot remains that day, the appointment is left as-is and
  reported back to the admin for manual follow-up.
- **Only free slots are ever shown.** A slot is hidden once a `BOOKED`
  appointment exists for that doctor/date/start time, or falls inside a
  break. `CANCELLED` appointments are ignored, so cancelling immediately
  releases the slot. Slots that have already passed today are hidden too.
- **Double-booking is prevented at the database level**, not just in
  application code. A partial unique index on
  `(doctorId, date, startMinutes) WHERE status = 'BOOKED'` means Postgres
  itself rejects a second `BOOKED` row for the same doctor/date/time. Two
  concurrent booking requests both pass the application-level "is it free?"
  check, then race to `INSERT`; exactly one succeeds, the other receives a
  Prisma `P2002` unique-constraint error, returned as a clean
  `409 Sorry, that slot was just booked`. Verified with 5 concurrent
  requests for the same slot — exactly 1 succeeded.
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

## 13. Deploying (e.g. Vercel)

1. Push to a git remote, import the repo into Vercel.
2. Set `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in
   Project Settings → Environment Variables (Production + Preview). Use the
   Supabase **session pooler** URL if on Supabase — see §4.
3. Run `npm run db:deploy` once against the production database (locally,
   pointed at the same `DATABASE_URL`, or as part of your build step) so
   the schema is in place before the app tries to query it.
4. Run `npm run db:seed` once to create the admin account.
5. Deploy / redeploy so the new environment variables take effect.

## Project structure

```
app/
  login/, register/            - auth pages
  admin/                       - admin portal (doctors, availability, breaks)
  patient/                     - patient portal (doctors, booking, appointments)
  api/                         - route handlers (auth, doctors, availability, breaks, appointments)
components/
  ui/                          - shared primitives (button, field, card, alert, badge, skeleton)
  doctors/                     - doctor form
lib/
  prisma.ts, auth.ts, session.ts, validations.ts, api.ts, api-client.ts, time.ts, reschedule.ts
prisma/
  schema.prisma, seed.ts, migrations/
proxy.ts                       - Next 16 proxy (auth gate for portal routes)
```

## Notes on scope

Deliberately excluded, per the "do not over-engineer" guidance this project
started from: payments, notifications/email, calendar integrations,
WebSockets, microservices, and a state-management library (React state is
sufficient here).
