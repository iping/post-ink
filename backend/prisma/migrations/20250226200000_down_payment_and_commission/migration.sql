-- Add totalAmount to Booking
ALTER TABLE "Booking" ADD COLUMN "totalAmount" REAL;

-- Add type and transferDestination to Payment (method already exists)
ALTER TABLE "Payment" ADD COLUMN "type" TEXT;
ALTER TABLE "Payment" ADD COLUMN "transferDestination" TEXT;

-- CreateTable StudioCommission
CREATE TABLE "StudioCommission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "commissionPercent" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudioCommission_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudioCommission_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "TattooArtist" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StudioCommission_studioId_artistId_key" ON "StudioCommission"("studioId", "artistId");
CREATE INDEX "StudioCommission_studioId_idx" ON "StudioCommission"("studioId");
CREATE INDEX "StudioCommission_artistId_idx" ON "StudioCommission"("artistId");
