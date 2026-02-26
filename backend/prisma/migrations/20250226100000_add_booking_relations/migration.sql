-- SQLite does not support adding FKs to existing tables; Prisma will enforce relations in the client.
-- Add indexes for booking/payment queries.
CREATE INDEX IF NOT EXISTS "Booking_artistId_idx" ON "Booking"("artistId");
CREATE INDEX IF NOT EXISTS "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX IF NOT EXISTS "Booking_date_idx" ON "Booking"("date");
CREATE INDEX IF NOT EXISTS "Payment_bookingId_idx" ON "Payment"("bookingId");
