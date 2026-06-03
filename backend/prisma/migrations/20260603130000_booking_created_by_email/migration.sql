-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "createdByEmail" TEXT;

-- Backfill from linked user where available
UPDATE "Booking" AS b
SET "createdByEmail" = LOWER(TRIM(u."email"))
FROM "User" AS u
WHERE b."createdById" = u."id"
  AND b."createdByEmail" IS NULL
  AND u."email" IS NOT NULL;
