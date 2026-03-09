-- CreateTable
CREATE TABLE "PaymentDestination" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "account" TEXT,
    "type" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "PaymentDestination_type_idx" ON "PaymentDestination"("type");
CREATE INDEX "PaymentDestination_isActive_idx" ON "PaymentDestination"("isActive");
