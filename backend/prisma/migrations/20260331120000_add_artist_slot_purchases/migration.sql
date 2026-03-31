-- CreateTable
CREATE TABLE "ArtistSlotPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "slots" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ArtistSlotPurchase_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ArtistSlotPurchase_studioId_idx" ON "ArtistSlotPurchase"("studioId");

-- CreateIndex
CREATE INDEX "ArtistSlotPurchase_status_idx" ON "ArtistSlotPurchase"("status");
