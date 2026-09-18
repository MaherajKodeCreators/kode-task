-- Reverts the specializations feature: restores Doctor.specialization as a
-- free-text column and removes the Specialization relation, WITHOUT losing
-- any doctor data.
--   1. Add specialization TEXT back, nullable at first.
--   2. Backfill it from the linked specializations.name.
--   3. Make it required, drop the FK column, drop the specializations table.

-- 1. Add the text column back (nullable so existing rows are not rejected).
ALTER TABLE "doctors" ADD COLUMN "specialization" TEXT;

-- 2. Backfill from the current relation before it is removed.
UPDATE "doctors" d
SET "specialization" = s."name"
FROM "specializations" s
WHERE s."id" = d."specializationId";

-- 3. Enforce NOT NULL now that every row has a value, then drop the relation.
ALTER TABLE "doctors" ALTER COLUMN "specialization" SET NOT NULL;

ALTER TABLE "doctors" DROP CONSTRAINT "doctors_specializationId_fkey";
DROP INDEX "doctors_specializationId_idx";
ALTER TABLE "doctors" DROP COLUMN "specializationId";

DROP TABLE "specializations";
