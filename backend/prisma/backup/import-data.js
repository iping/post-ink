import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..', '..');
const prisma = new PrismaClient();

async function importAll() {
  const filePath = path.join(__dirname, 'seed-data.json');
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));

  console.log(`Importing data exported at ${data.exportedAt} ...`);

  execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });

  // Clear existing data (order matters for FK constraints)
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.studioCommission.deleteMany({});
  await prisma.artistAvailability.deleteMany({});
  await prisma.tattooArtist.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.tattooStudio.deleteMany({});
  await prisma.speciality.deleteMany({});

  const strip = ({ createdAt, updatedAt, ...rest }) => rest;

  if (data.specialities?.length) {
    for (const s of data.specialities) {
      await prisma.speciality.create({ data: strip(s) });
    }
    console.log(`  ${data.specialities.length} specialities`);
  }

  for (const a of data.artists) {
    await prisma.tattooArtist.create({ data: strip(a) });
  }
  console.log(`  ${data.artists.length} artists`);

  for (const s of data.studios) {
    await prisma.tattooStudio.create({ data: strip(s) });
  }
  console.log(`  ${data.studios.length} studios`);

  for (const c of data.customers) {
    await prisma.customer.create({ data: strip(c) });
  }
  console.log(`  ${data.customers.length} customers`);

  for (const av of data.availability) {
    await prisma.artistAvailability.create({ data: strip(av) });
  }
  console.log(`  ${data.availability.length} availability slots`);

  for (const b of data.bookings) {
    await prisma.booking.create({ data: strip(b) });
  }
  console.log(`  ${data.bookings.length} bookings`);

  for (const p of data.payments) {
    await prisma.payment.create({ data: strip(p) });
  }
  console.log(`  ${data.payments.length} payments`);

  for (const cm of data.commissions) {
    await prisma.studioCommission.create({ data: strip(cm) });
  }
  console.log(`  ${data.commissions.length} commissions`);

  console.log('Import complete!');
}

importAll()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
