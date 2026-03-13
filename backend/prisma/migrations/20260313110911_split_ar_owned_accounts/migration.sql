-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "artistReceivableAmount" REAL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "balanceReceiverType" TEXT;
ALTER TABLE "Booking" ADD COLUMN "bookingFeeAmount" REAL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "bookingFeeReceiverType" TEXT;
ALTER TABLE "Booking" ADD COLUMN "studioReceivableAmount" REAL DEFAULT 0;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT,
    "paymentDestinationId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "type" TEXT,
    "method" TEXT,
    "transferDestination" TEXT,
    "receiverType" TEXT,
    "receiverStudioId" TEXT,
    "receiverArtistId" TEXT,
    "evidenceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_paymentDestinationId_fkey" FOREIGN KEY ("paymentDestinationId") REFERENCES "PaymentDestination" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_receiverStudioId_fkey" FOREIGN KEY ("receiverStudioId") REFERENCES "TattooStudio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_receiverArtistId_fkey" FOREIGN KEY ("receiverArtistId") REFERENCES "TattooArtist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "bookingId", "createdAt", "currency", "evidenceUrl", "id", "method", "status", "transferDestination", "type", "updatedAt") SELECT "amount", "bookingId", "createdAt", "currency", "evidenceUrl", "id", "method", "status", "transferDestination", "type", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_bookingId_idx" ON "Payment"("bookingId");
CREATE INDEX "Payment_paymentDestinationId_idx" ON "Payment"("paymentDestinationId");
CREATE INDEX "Payment_receiverType_idx" ON "Payment"("receiverType");
CREATE INDEX "Payment_receiverStudioId_idx" ON "Payment"("receiverStudioId");
CREATE INDEX "Payment_receiverArtistId_idx" ON "Payment"("receiverArtistId");
CREATE TABLE "new_PaymentDestination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "account" TEXT,
    "type" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "studioId" TEXT,
    "artistId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PaymentDestination_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentDestination_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "TattooArtist" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PaymentDestination" ("account", "artistId", "createdAt", "id", "isActive", "name", "ownerType", "studioId", "type", "updatedAt")
SELECT
    "account",
    NULL,
    "createdAt",
    "id",
    "isActive",
    "name",
    'studio',
    (SELECT "id" FROM "TattooStudio" ORDER BY "createdAt" ASC LIMIT 1),
    "type",
    "updatedAt"
FROM "PaymentDestination";
DROP TABLE "PaymentDestination";
ALTER TABLE "new_PaymentDestination" RENAME TO "PaymentDestination";
CREATE INDEX "PaymentDestination_type_idx" ON "PaymentDestination"("type");
CREATE INDEX "PaymentDestination_isActive_idx" ON "PaymentDestination"("isActive");
CREATE INDEX "PaymentDestination_ownerType_idx" ON "PaymentDestination"("ownerType");
CREATE INDEX "PaymentDestination_studioId_idx" ON "PaymentDestination"("studioId");
CREATE INDEX "PaymentDestination_artistId_idx" ON "PaymentDestination"("artistId");

UPDATE "Payment"
SET
  "receiverType" = CASE
    WHEN "bookingId" IS NULL THEN 'studio'
    WHEN "type" = 'down_payment' THEN 'studio'
    ELSE 'artist'
  END,
  "receiverStudioId" = CASE
    WHEN "bookingId" IS NOT NULL AND "type" = 'down_payment'
      THEN (SELECT "studioId" FROM "Booking" WHERE "Booking"."id" = "Payment"."bookingId")
    WHEN "bookingId" IS NULL
      THEN (SELECT "id" FROM "TattooStudio" ORDER BY "createdAt" ASC LIMIT 1)
    ELSE NULL
  END,
  "receiverArtistId" = CASE
    WHEN "bookingId" IS NOT NULL AND "type" <> 'down_payment'
      THEN (SELECT "artistId" FROM "Booking" WHERE "Booking"."id" = "Payment"."bookingId")
    ELSE NULL
  END,
  "paymentDestinationId" = CASE
    WHEN "type" = 'down_payment' THEN (
      SELECT "id"
      FROM "PaymentDestination"
      WHERE ("account" IS NOT NULL AND "account" = "Payment"."transferDestination")
         OR "name" = "Payment"."transferDestination"
         OR "name" = "Payment"."method"
      ORDER BY "createdAt" ASC
      LIMIT 1
    )
    ELSE NULL
  END;

UPDATE "Booking"
SET
  "bookingFeeAmount" = COALESCE((
    SELECT SUM("Payment"."amount")
    FROM "Payment"
    WHERE "Payment"."bookingId" = "Booking"."id"
      AND "Payment"."type" = 'down_payment'
      AND "Payment"."status" = 'completed'
  ), 0),
  "bookingFeeReceiverType" = CASE
    WHEN EXISTS (
      SELECT 1
      FROM "Payment"
      WHERE "Payment"."bookingId" = "Booking"."id"
        AND "Payment"."type" = 'down_payment'
        AND "Payment"."receiverType" = 'artist'
    ) THEN 'artist'
    WHEN "studioId" IS NOT NULL THEN 'studio'
    ELSE 'artist'
  END,
  "balanceReceiverType" = CASE
    WHEN "artistId" IS NOT NULL THEN 'artist'
    WHEN "studioId" IS NOT NULL THEN 'studio'
    ELSE NULL
  END;

UPDATE "Booking"
SET
  "studioReceivableAmount" =
    CASE
      WHEN "bookingFeeReceiverType" = 'studio' THEN COALESCE("bookingFeeAmount", 0)
      ELSE 0
    END +
    CASE
      WHEN "balanceReceiverType" = 'studio' THEN MAX(COALESCE("totalAmount", 0) - COALESCE("bookingFeeAmount", 0), 0)
      ELSE 0
    END,
  "artistReceivableAmount" =
    CASE
      WHEN "bookingFeeReceiverType" = 'artist' THEN COALESCE("bookingFeeAmount", 0)
      ELSE 0
    END +
    CASE
      WHEN "balanceReceiverType" = 'artist' THEN MAX(COALESCE("totalAmount", 0) - COALESCE("bookingFeeAmount", 0), 0)
      ELSE 0
    END;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
