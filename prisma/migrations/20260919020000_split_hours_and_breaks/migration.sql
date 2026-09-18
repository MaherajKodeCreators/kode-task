-- Supports split working hours (multiple availability periods per doctor per
-- day) and doctor breaks.

-- 1. Drop the "one availability per doctor per day" constraint - a doctor can
-- now have several (e.g. 09:00-13:00 and 14:00-17:00).
DROP INDEX "doctor_availabilities_doctorId_date_key";
DROP INDEX "doctor_availabilities_date_idx";
CREATE INDEX "doctor_availabilities_doctorId_date_idx" ON "doctor_availabilities"("doctorId", "date");

-- 2. New table: doctor breaks.
CREATE TABLE "doctor_breaks" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMinutes" INTEGER NOT NULL,
    "endMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_breaks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "doctor_breaks_doctorId_date_idx" ON "doctor_breaks"("doctorId", "date");

ALTER TABLE "doctor_breaks" ADD CONSTRAINT "doctor_breaks_doctorId_fkey"
  FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
