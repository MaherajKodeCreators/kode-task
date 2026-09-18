Build the complete Developer Knowledge Test appointment booking system as a single full-stack Next.js application.

IMPORTANT:

- Use ONE Next.js project for both frontend and backend.
- Do NOT create a separate Express/backend project.
- Use Next.js App Router and Route Handlers for APIs.
- Use TypeScript throughout the project.
- Keep the implementation clean, simple, production-minded, and easy to understand.
- Do not over-engineer the solution.

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- Zod for validation
- React Hook Form where useful
- bcrypt for password hashing
- HTTP-only cookie/session-based authentication
- REST-style APIs using Next.js Route Handlers

## Core Requirement

Build a simple appointment booking system with two separate portals:

1. Admin Portal
2. Patient Portal

Both portals must live inside the same Next.js application.

---

# 1. ADMIN PORTAL

Admin should be able to:

### Doctor Management

- View all doctors.
- Add a new doctor.
- Edit doctor information.
- Delete/deactivate a doctor if needed.
- Doctor fields:
  - Name
  - Specialization
  - Optional email/contact information

### Doctor Availability

Admin can set a doctor's availability for a specific day.

For this task:

- A doctor can have only ONE availability period per day.
- Example:
  - Date: 2026-09-20
  - Start: 09:00 AM
  - End: 05:00 PM

Admin should be able to:

- Select a doctor.
- Select a date.
- Set start time.
- Set end time.
- Update existing availability.
- Remove availability.
- View availability for all doctors.

Validation:

- End time must be after start time.
- A doctor cannot have multiple availability periods for the same date.

---

# 2. PATIENT PORTAL

### Patient Registration

Patient should be able to create an account with:

- Name
- Email
- Password

Requirements:

- Validate required fields.
- Validate email format.
- Hash passwords using bcrypt.
- Do not store plain-text passwords.
- Prevent duplicate patient email accounts.

### Patient Login

Patient should be able to:

- Log in with email/password.
- Stay authenticated using a secure HTTP-only cookie/session.
- Log out.

Protected patient pages/API routes should require authentication.

---

# 3. DOCTOR LIST

After login, patient should be able to see the list of doctors.

Display:

- Doctor name
- Specialization
- Availability information
- Action to select/view doctor

Only active doctors should be displayed.

---

# 4. DOCTOR AVAILABILITY / TIME SLOTS

After selecting a doctor, the patient should be able to see that doctor's available appointment slots.

Important:

- Only show slots that fall inside the doctor's configured availability.
- Do not show slots that have already been booked.
- Do not show cancelled appointments as unavailable.
- If an appointment is cancelled, that slot must become available again.

For appointment slot generation:

- Use a 30-minute slot duration unless the implementation clearly documents another reasonable assumption.
- Example:
  Availability: 09:00 AM - 12:00 PM

  Slots:
  09:00
  09:30
  10:00
  10:30
  11:00
  11:30

Do not create slots outside the configured availability.

The UI should make unavailable/booked slots clearly distinguishable or simply hide them according to the requirement:
"Only available time slots should be shown to the patient."

---

# 5. BOOK APPOINTMENT

Patient can:

- Select an available date.
- Select an available time slot.
- Book the appointment.

An appointment must be connected to:

- One patient
- One doctor
- One date/time

Appointment fields should include:

- Patient
- Doctor
- Date
- Start time
- End time
- Status
- Created timestamp

Default status:
BOOKED

IMPORTANT BOOKING RULE:

A time slot must NEVER be bookable by two patients.

Do not rely only on frontend validation.

Prevent duplicate bookings at the database level using an appropriate unique constraint/index and/or transaction strategy.

The booking API should:

1. Verify the patient is authenticated.
2. Verify the doctor exists and is active.
3. Verify the doctor has availability for the selected date.
4. Verify the requested slot is inside the doctor's availability.
5. Verify the slot has not already been booked.
6. Create the appointment atomically.
7. Return a proper success/error response.

Handle race conditions where two patients attempt to book the same slot at the same time.

---

# 6. PATIENT APPOINTMENTS

Patient should be able to view their booked appointments.

Display:

- Doctor
- Specialization
- Date
- Start time
- End time
- Status

Patient should only be able to see their own appointments.

---

# 7. CANCEL APPOINTMENT

Patient can cancel their appointment.

When cancelled:

- Change appointment status to CANCELLED.
- Do not delete the appointment record.
- The time slot must become available for another patient.
- Patient should no longer see it as an active booked appointment.

Prevent patients from cancelling another patient's appointment.

If appropriate, prevent cancellation of already-cancelled appointments.

---

# 8. DATABASE DESIGN

Use PostgreSQL with Prisma.

Create a clean relational schema.

Recommended entities:

### User / Patient

- id
- name
- email
- passwordHash
- role
- createdAt
- updatedAt

Roles:

- ADMIN
- PATIENT

### Doctor

- id
- name
- specialization
- email/contact if required
- isActive
- createdAt
- updatedAt

### DoctorAvailability

- id
- doctorId
- date
- startTime
- endTime
- createdAt
- updatedAt

Constraint:

- One availability record per doctor per date.

### Appointment

- id
- doctorId
- patientId
- date
- startTime
- endTime
- status
- createdAt
- updatedAt

Use proper Prisma relations and indexes.

Ensure the database prevents duplicate active bookings for the same doctor/date/time.

---

# 9. API STRUCTURE

Use Next.js Route Handlers.

Example:

/api/auth/register
/api/auth/login
/api/auth/logout
/api/auth/me

/api/doctors
/api/doctors/[id]

/api/doctors/[id]/availability
/api/availability

/api/appointments
/api/appointments/[id]
/api/appointments/[id]/cancel

Use appropriate HTTP methods:

- GET
- POST
- PUT/PATCH
- DELETE where appropriate

Return consistent JSON responses.

Example:

Success:
{
"success": true,
"data": {}
}

Error:
{
"success": false,
"message": "..."
}

Use Zod to validate API inputs.

---

# 10. AUTHENTICATION / AUTHORIZATION

Implement authentication for patients.

Admin functionality must be protected so patients cannot access admin APIs/pages.

Create a simple admin authentication mechanism.

For development/testing, seed an admin account using Prisma seed.

Example:

- Email: admin@example.com
- Password: Admin@123

Do not hardcode sensitive credentials in production code.

Use environment variables where appropriate.

Passwords must be hashed with bcrypt.

Use secure HTTP-only cookies for authentication.

Do not store authentication tokens/passwords in localStorage.

---

# 11. FRONTEND ROUTES

Use Next.js App Router.

Suggested structure:

/login
/register

/admin
/admin/doctors
/admin/doctors/new
/admin/doctors/[id]
/admin/availability

/patient
/patient/doctors
/patient/doctors/[id]
/patient/appointments

Create a simple dashboard/navigation for both portals.

---

# 12. ADMIN UI

Admin dashboard should provide:

- Doctors list
- Add Doctor
- Edit Doctor
- Doctor availability management
- Availability overview

Availability UI should make it easy to:

- Select doctor
- Select date
- Enter start time
- Enter end time
- Save/update availability

---

# 13. PATIENT UI

Patient dashboard should provide:

- Doctors list
- Doctor selection
- Date selection
- Available appointment slots
- Booking confirmation
- My Appointments
- Cancel appointment
- Logout

Make the UI responsive and clean.

Use Tailwind CSS.

Include:

- Loading states
- Empty states
- Error states
- Form validation messages
- Success/error feedback
- Disabled states while submitting

---

# 14. APPOINTMENT LOGIC

Important business rules:

1. Only available slots should be shown.
2. A doctor has at most one availability period per day.
3. A booking belongs to exactly one patient and one doctor.
4. A patient cannot book an already-booked slot.
5. A cancelled appointment releases the slot.
6. Patients can only manage their own appointments.
7. Patients cannot access admin functionality.
8. Admin can manage doctors and availability.
9. Availability cannot have an end time before or equal to the start time.
10. Booking must be validated on the server, not just the frontend.
11. Duplicate booking must be prevented at the database/transaction level.

---

# 15. DATABASE / PRISMA

Create:

- Prisma schema
- Migrations
- Prisma client setup
- Seed script for admin and optionally sample doctors/availability

Add useful indexes for:

- Doctor + date availability
- Doctor + date + time appointment lookup
- Patient appointments

Use Prisma transactions where required.

---

# 16. PROJECT STRUCTURE

Use a clean structure similar to:

src/
app/
login/
register/

    admin/
      page.tsx
      doctors/
      availability/

    patient/
      page.tsx
      doctors/
      appointments/

    api/
      auth/
      doctors/
      availability/
      appointments/

components/
ui/
forms/
doctors/
appointments/

lib/
prisma.ts
auth.ts
validations.ts

types/

prisma/
schema.prisma
seed.ts

.env
.env.example

---

# 17. ERROR HANDLING

Handle cases such as:

- Invalid login
- Duplicate registration email
- Doctor not found
- Inactive doctor
- Invalid availability
- Availability not configured
- Invalid appointment slot
- Slot already booked
- Appointment not found
- Unauthorized access
- Cancelling an already cancelled appointment

Never expose sensitive database/authentication information in API errors.

---

# 18. README

Create a README explaining:

1. Project overview
2. Tech stack
3. Requirements
4. PostgreSQL setup
5. Environment variables
6. Prisma setup
7. Migration commands
8. Seed command
9. Development command
10. Admin test credentials
11. Main API routes
12. Appointment booking logic/assumptions

Include `.env.example`.

---

# 19. IMPORTANT IMPLEMENTATION APPROACH

Do not create unnecessary complexity.

This is a developer knowledge test, so prioritize:

- Correct database relationships
- Correct appointment logic
- Authentication
- Authorization
- Server-side validation
- Prevention of duplicate bookings
- Clean React/Next.js architecture
- Good UX

Do not add unnecessary features such as:

- Payments
- Notifications
- Email services
- Calendar integrations
- WebSockets
- Microservices
- Redux unless genuinely needed

---

# 20. FINAL ACCEPTANCE FLOW

The completed application must support this exact flow:

ADMIN:
Admin logs in
→ Admin adds a doctor
→ Admin sets the doctor's daily availability
→ Admin can view doctor availability

PATIENT:
Patient creates an account
→ Patient logs in
→ Patient views doctors
→ Patient selects a doctor
→ Patient selects a date
→ Patient sees available appointment slots
→ Patient selects a slot
→ Patient books appointment
→ Patient views booked appointment
→ Patient cancels appointment
→ The cancelled slot becomes available again for another patient

Before finishing:

- Run Prisma migrations.
- Seed the database.
- Verify the application builds successfully.
- Verify TypeScript has no errors.
- Test the complete admin and patient flows.
- Test duplicate booking prevention.
- Test cancellation and slot re-availability.
- Test authorization so patients cannot access admin APIs.
