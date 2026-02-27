-- AlterTable: add rate (hourly rate in IDR) to TattooArtist
ALTER TABLE "TattooArtist" ADD COLUMN "rate" REAL;

-- AlterTable: change Payment default currency to IDR
-- (SQLite doesn't support ALTER COLUMN DEFAULT, existing rows keep their value)
