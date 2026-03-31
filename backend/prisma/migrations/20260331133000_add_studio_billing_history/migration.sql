-- CreateTable
CREATE TABLE "StudioBillingHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studioId" TEXT NOT NULL,
    "billingDate" TEXT NOT NULL,
    "dueDate" TEXT,
    "cycle" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudioBillingHistory_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "TattooStudio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StudioBillingHistory_studioId_idx" ON "StudioBillingHistory"("studioId");

-- CreateIndex
CREATE INDEX "StudioBillingHistory_billingDate_idx" ON "StudioBillingHistory"("billingDate");
