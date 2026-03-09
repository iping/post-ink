-- AlterTable: add pricingType to Booking (fixed = final price in totalAmount; hourly = total from projects, accumulative)
ALTER TABLE "Booking" ADD COLUMN "pricingType" TEXT;
