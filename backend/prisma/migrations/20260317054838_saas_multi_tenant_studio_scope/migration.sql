-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL DEFAULT 'customer',
    "leadSource" TEXT,
    "referredArtistId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Customer_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Customer_referredArtistId_fkey" FOREIGN KEY ("referredArtistId") REFERENCES "TattooArtist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("createdAt", "email", "id", "leadSource", "name", "phone", "referredArtistId", "type", "updatedAt") SELECT "createdAt", "email", "id", "leadSource", "name", "phone", "referredArtistId", "type", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_studioId_idx" ON "Customer"("studioId");
CREATE INDEX "Customer_type_idx" ON "Customer"("type");
CREATE INDEX "Customer_leadSource_idx" ON "Customer"("leadSource");
CREATE INDEX "Customer_referredArtistId_idx" ON "Customer"("referredArtistId");
CREATE TABLE "new_Speciality" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Speciality_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Speciality" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Speciality";
DROP TABLE "Speciality";
ALTER TABLE "new_Speciality" RENAME TO "Speciality";
CREATE INDEX "Speciality_studioId_idx" ON "Speciality"("studioId");
CREATE UNIQUE INDEX "Speciality_studioId_name_key" ON "Speciality"("studioId", "name");
CREATE TABLE "new_TattooArtist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "experiences" TEXT,
    "speciality" TEXT,
    "rate" REAL,
    "photos" TEXT NOT NULL,
    "portfolio" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TattooArtist_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TattooArtist" ("createdAt", "experiences", "id", "isActive", "name", "photos", "portfolio", "rate", "shortDescription", "speciality", "updatedAt") SELECT "createdAt", "experiences", "id", "isActive", "name", "photos", "portfolio", "rate", "shortDescription", "speciality", "updatedAt" FROM "TattooArtist";
DROP TABLE "TattooArtist";
ALTER TABLE "new_TattooArtist" RENAME TO "TattooArtist";
CREATE INDEX "TattooArtist_studioId_idx" ON "TattooArtist"("studioId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "studioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "passwordHash", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_studioId_idx" ON "User"("studioId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
