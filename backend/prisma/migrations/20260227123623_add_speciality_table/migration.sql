-- CreateTable
CREATE TABLE "Speciality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "artistId" TEXT NOT NULL,
    "customerId" TEXT,
    "studioId" TEXT,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalAmount" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "TattooArtist" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Booking_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Booking" ("artistId", "createdAt", "customerId", "date", "endTime", "id", "notes", "startTime", "status", "studioId", "totalAmount", "updatedAt") SELECT "artistId", "createdAt", "customerId", "date", "endTime", "id", "notes", "startTime", "status", "studioId", "totalAmount", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_artistId_idx" ON "Booking"("artistId");
CREATE INDEX "Booking_customerId_idx" ON "Booking"("customerId");
CREATE INDEX "Booking_date_idx" ON "Booking"("date");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT,
    "method" TEXT,
    "transferDestination" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "bookingId", "createdAt", "currency", "id", "method", "status", "transferDestination", "type", "updatedAt") SELECT "amount", "bookingId", "createdAt", "currency", "id", "method", "status", "transferDestination", "type", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Speciality_name_key" ON "Speciality"("name");
