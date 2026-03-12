-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shortCode" TEXT,
    "artistId" TEXT NOT NULL,
    "customerId" TEXT,
    "studioId" TEXT,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Unpaid',
    "pricingType" TEXT,
    "totalAmount" REAL,
    "placement" TEXT,
    "preference" TEXT,
    "projectName" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "TattooArtist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("artistId", "createdAt", "customerId", "date", "endTime", "id", "notes", "placement", "preference", "pricingType", "projectName", "shortCode", "startTime", "status", "studioId", "totalAmount", "updatedAt") SELECT "artistId", "createdAt", "customerId", "date", "endTime", "id", "notes", "placement", "preference", "pricingType", "projectName", "shortCode", "startTime", CASE WHEN "Booking"."id" IN (SELECT "bookingId" FROM "Payment" WHERE "status" = 'completed' AND "bookingId" IS NOT NULL) THEN 'Paid' ELSE 'Unpaid' END, "studioId", "totalAmount", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE UNIQUE INDEX "Booking_shortCode_key" ON "Booking"("shortCode");
CREATE INDEX "Booking_artistId_idx" ON "Booking"("artistId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_date_idx" ON "Booking"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
