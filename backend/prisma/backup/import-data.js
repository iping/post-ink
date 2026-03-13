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
  await prisma.session.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.paymentDestination.deleteMany({});
  await prisma.studioCommission.deleteMany({});
  await prisma.artistAvailability.deleteMany({});
  await prisma.tattooArtist.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.tattooStudio.deleteMany({});
  await prisma.speciality.deleteMany({});

  const strip = ({
    createdAt,
    updatedAt,
    bookingFeeAmount,
    bookingFeeReceiverType,
    balanceReceiverType,
    studioReceivableAmount,
    artistReceivableAmount,
    ...rest
  }) => rest;

  if (data.specialities?.length) {
    for (const s of data.specialities) {
      await prisma.speciality.create({ data: strip(s) });
    }
    console.log(`  ${data.specialities.length} specialities`);
  }

  for (const a of data.tattooArtists || []) {
    await prisma.tattooArtist.create({ data: strip(a) });
  }
  console.log(`  ${(data.tattooArtists || []).length} artists`);

  for (const s of data.tattooStudios || []) {
    await prisma.tattooStudio.create({ data: strip(s) });
  }
  console.log(`  ${(data.tattooStudios || []).length} studios`);

  for (const c of data.customers || []) {
    await prisma.customer.create({ data: strip(c) });
  }
  console.log(`  ${(data.customers || []).length} customers`);

  for (const av of data.artistAvailability || []) {
    await prisma.artistAvailability.create({ data: strip(av) });
  }
  console.log(`  ${(data.artistAvailability || []).length} availability slots`);

  for (const b of data.bookings || []) {
    await prisma.booking.create({ data: strip(b) });
  }
  console.log(`  ${(data.bookings || []).length} bookings`);

  for (const project of data.projects || []) {
    await prisma.project.create({ data: strip(project) });
  }
  console.log(`  ${(data.projects || []).length} projects`);

  for (const session of data.sessions || []) {
    await prisma.session.create({ data: strip(session) });
  }
  console.log(`  ${(data.sessions || []).length} sessions`);

  for (const destination of data.paymentDestinations || []) {
    await prisma.paymentDestination.create({ data: strip(destination) });
  }
  console.log(`  ${(data.paymentDestinations || []).length} payment destinations`);

  for (const p of data.payments || []) {
    await prisma.payment.create({ data: strip(p) });
  }
  console.log(`  ${(data.payments || []).length} payments`);

  for (const cm of data.studioCommissions || []) {
    await prisma.studioCommission.create({ data: strip(cm) });
  }
  console.log(`  ${(data.studioCommissions || []).length} commissions`);

  console.log('Import complete!');
}

importAll()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
