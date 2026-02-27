import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function exportAll() {
  const data = {
    exportedAt: new Date().toISOString(),
    artists: await prisma.tattooArtist.findMany({ orderBy: { createdAt: 'asc' } }),
    availability: await prisma.artistAvailability.findMany({ orderBy: { createdAt: 'asc' } }),
    studios: await prisma.tattooStudio.findMany({ orderBy: { createdAt: 'asc' } }),
    customers: await prisma.customer.findMany({ orderBy: { createdAt: 'asc' } }),
    bookings: await prisma.booking.findMany({ orderBy: { createdAt: 'asc' } }),
    payments: await prisma.payment.findMany({ orderBy: { createdAt: 'asc' } }),
    commissions: await prisma.studioCommission.findMany({ orderBy: { createdAt: 'asc' } }),
    reviews: await prisma.review.findMany({ orderBy: { createdAt: 'asc' } }),
  };

  const outPath = path.join(__dirname, 'seed-data.json');
  writeFileSync(outPath, JSON.stringify(data, null, 2));

  console.log(`Exported to ${outPath}`);
  console.log(`  ${data.artists.length} artists`);
  console.log(`  ${data.availability.length} availability slots`);
  console.log(`  ${data.studios.length} studios`);
  console.log(`  ${data.customers.length} customers`);
  console.log(`  ${data.bookings.length} bookings`);
  console.log(`  ${data.payments.length} payments`);
  console.log(`  ${data.commissions.length} commissions`);
  console.log(`  ${data.reviews.length} reviews`);
}

exportAll()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
