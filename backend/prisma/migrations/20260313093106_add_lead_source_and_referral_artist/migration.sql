-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'customer',
    "leadSource" TEXT,
    "referredArtistId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_referredArtistId_fkey" FOREIGN KEY ("referredArtistId") REFERENCES "TattooArtist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "email", "id", "name", "phone", "type", "updatedAt") SELECT "createdAt", "email", "id", "name", "phone", "type", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_type_idx" ON "Customer"("type");
CREATE INDEX "Customer_leadSource_idx" ON "Customer"("leadSource");
CREATE INDEX "Customer_referredArtistId_idx" ON "Customer"("referredArtistId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
