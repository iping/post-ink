-- AlterTable: add shortCode (5-char alphanumeric) to Booking
ALTER TABLE "Booking" ADD COLUMN "shortCode" TEXT;

CREATE UNIQUE INDEX "Booking_shortCode_key" ON "Booking"("shortCode");
