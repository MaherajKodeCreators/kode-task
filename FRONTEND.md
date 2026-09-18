# Frontend Guide

Frontend-focused companion to [README.md](README.md) (which covers full
setup, DB, migrations). This file is for understanding the UI/portal
structure and getting into the app quickly.

## 1. What this app is

Appointment booking system, two portals in one Next.js app:

- **Admin portal** (`/admin`) — manage doctors, set availability windows
  (supports split hours, e.g. 9–1 and 2–5 same day), add doctor breaks.
- **Patient portal** (`/patient`) — register/login, browse doctors, pick a
  date/slot, book, view/cancel own appointments.

No separate frontend/backend split — Next.js App Router pages call Next.js
Route Handlers (`app/api/**`) on the same origin.

## 2. Test credentials

Seeded by `npm run db:seed` (see README §8). Dev-only defaults, not secrets —
safe to share, configurable via `.env` before seeding.

```
Admin:
  Email:    admin@example.com
  Password: Admin@123

Patient:
  No seeded patient — register one at /register (any email/password ≥ 8 chars).
```

Sample doctors seeded too: Dr. Asha Menon (Cardiology), Dr. Rahul Verma
(Dermatology), Dr. Priya Nair (Pediatrics) — each with 5 days of
availability already configured, so the patient booking flow works
immediately after seeding without touching the admin portal first.

**Real infra credentials (DB URL, session secret) live only in `.env`,
never in this file or git.** See README §5.

## 3. Route map

```
/                          → redirects to /login or the user's portal
/login, /register          → public auth pages

/admin                     → redirects to /admin/doctors
/admin/doctors             → list + deactivate/activate doctors
/admin/doctors/new         → add doctor
/admin/doctors/[id]        → edit doctor
/admin/availability        → add/remove availability windows + breaks,
                              view all windows/breaks across doctors

/patient                   → redirects to /patient/doctors
/patient/doctors           → list of active doctors
/patient/doctors/[id]      → pick date → see slots → book
/patient/appointments      → view booked/cancelled, cancel a booking
```

Route protection: `proxy.ts` does an optimistic cookie check (keeps
signed-out users off `/admin` and `/patient`); every page/API route
independently re-verifies the session server-side — see
[lib/auth.ts](lib/auth.ts).

## 4. UI architecture

- **Server components by default.** Pages that just read data (doctor list,
  edit-doctor form data) fetch directly via Prisma server-side — no API
  round trip needed for the initial render.
- **Client components** (`'use client'`) only where there's interactivity:
  forms, the booking panel, doctor/availability lists that need optimistic
  refresh after a mutation.
- **Shared primitives** in [components/ui/](components/ui/):
  `Button`, `Card`, `EmptyState`, `Spinner`, `StatusBadge`, `InputField`,
  `PasswordField`, `SelectField`, `Skeleton`/`SkeletonRow`/`SkeletonCard`,
  `Alert`. Everything else composes these — don't hand-roll a new button/card
  style, extend these.
- **Forms** use `react-hook-form` + `@hookform/resolvers/zod`, validating
  against the same Zod schemas the API uses ([lib/validations.ts](lib/validations.ts)) —
  client and server never validate differently.
- **API calls from client components** go through [lib/api-client.ts](lib/api-client.ts)
  (`apiGet`/`apiPost`/`apiPatch`/`apiDelete`), which unwraps the
  `{ success, data }` / `{ success, message }` envelope consistently.

## 5. Design system

Colors/typography ported from `maxlife-admin` (a separate reference app) —
see [app/globals.css](app/globals.css) for the token source of truth.

| Token | Value | Use |
|---|---|---|
| `text-primary` / `bg-primary` | `#1f6feb` | Brand blue — primary buttons, active nav, links |
| `text-secondary` | `#545d6e` | Muted/secondary text |
| `border-light` | `#cddcf299` | Card/input borders |
| `surface`, `surface-overlay` | `#f9fafc`, `#f1f5f9` | Backgrounds, hover states |

Conventions:
- Buttons are pill-shaped (`rounded-full`).
- Cards: `rounded-2xl`, no shadow, `border-border-light`.
- Inputs: `rounded-[8px]`, 48px min height, primary focus ring.
- Status badges: `rounded-sm`, solid fill (green=BOOKED/active, gray=inactive/cancelled).
- Font: Inter (body), JetBrains Mono (code/mono), loaded via `next/font/google`
  in [app/layout.tsx](app/layout.tsx).
- Icons: `lucide-react` only — don't mix in another icon set.
- **Light mode only** — no dark mode is wired up (intentional, matches the
  reference app).

Never use raw Tailwind slate/gray-* palette colors directly in new UI —
route through the tokens above so a future palette change is one file.

## 6. Business rules the UI must respect

These are enforced server-side (never trust the client alone), but the UI
should reflect them so users aren't confused:

- A doctor can have **multiple availability windows per day** (split hours).
  Time between windows is never a bookable slot.
- A **break** inside a window blocks that time from new bookings. If a break
  is added over an existing booked appointment, that appointment is
  auto-moved to the nearest free slot the same day — the admin UI shows a
  "rescheduled" notice listing what moved where.
- Cancelling an appointment immediately frees that slot for other patients.
- Date pickers must not allow past dates (`min` set to today) — both in the
  admin availability/break forms and implicitly on the patient side (only
  future dates with configured availability are ever listed).
- Patients only ever see **active** doctors and only their **own**
  appointments.

## 7. Local dev quick start

```bash
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET (see README §5)
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Visit `http://localhost:3000`, log in with the admin credentials above, or
register a new patient.
