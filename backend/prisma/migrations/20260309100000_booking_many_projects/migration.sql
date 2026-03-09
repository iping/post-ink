-- DropIndex: allow multiple projects per booking (one booking, many sessions/projects)
DROP INDEX IF EXISTS "Project_bookingId_key";
