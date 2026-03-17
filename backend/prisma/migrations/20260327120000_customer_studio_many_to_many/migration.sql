-- Create StudioCustomer and backfill, then remove Customer.studioId (with FKs deferred)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1) Create StudioCustomer (references Customer and TattooStudio)
CREATE TABLE "StudioCustomer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudioCustomer_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudioCustomer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "StudioCustomer" ("id", "studioId", "customerId", "createdAt")
SELECT ('sc-' || "id" || '-' || hex(randomblob(4))), "studioId", "id", datetime('now') FROM "Customer" WHERE "studioId" IS NOT NULL;
CREATE UNIQUE INDEX "StudioCustomer_studioId_customerId_key" ON "StudioCustomer"("studioId", "customerId");
CREATE INDEX "StudioCustomer_studioId_idx" ON "StudioCustomer"("studioId");
CREATE INDEX "StudioCustomer_customerId_idx" ON "StudioCustomer"("customerId");

-- 2) Recreate Customer without studioId
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
INSERT INTO "new_Customer" ("createdAt", "email", "id", "leadSource", "name", "phone", "referredArtistId", "type", "updatedAt") SELECT "createdAt", "email", "id", "leadSource", "name", "phone", "referredArtistId", "type", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_type_idx" ON "Customer"("type");
CREATE INDEX "Customer_leadSource_idx" ON "Customer"("leadSource");
CREATE INDEX "Customer_referredArtistId_idx" ON "Customer"("referredArtistId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
