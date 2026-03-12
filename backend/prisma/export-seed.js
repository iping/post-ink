/**
 * Export current database contents to backup/seed-data.json.
 * Run: npm run export-seed (from backend) or node prisma/export-seed.js
 * Use this to "save all data to seed" before resetting or migrating.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

async function main() {
  const [
    specialities,
    tattooArtists,
    artistAvailability,
    tattooStudios,
    customers,
    bookings,
    projects,
    sessions,
    payments,
    paymentDestinations,
    studioCommissions,
  ] = await Promise.all([
    prisma.speciality.findMany({ orderBy: { name: 'asc' } }),
    prisma.tattooArtist.findMany({ orderBy: { name: 'asc' } }),
    prisma.artistAvailability.findMany({ orderBy: [{ artistId: 'asc' }, { date: 'asc' }, { startTime: 'asc' }] }),
    prisma.tattooStudio.findMany({ orderBy: { name: 'asc' } }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.booking.findMany({
      include: { artist: true, customer: true, studio: true, payments: true, projects: true },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
    }),
    prisma.project.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.session.findMany({ orderBy: [{ date: 'asc' }, { startTime: 'asc' }], include: { project: true } }),
    prisma.payment.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.paymentDestination.findMany({ orderBy: { name: 'asc' } }),
    prisma.studioCommission.findMany({ orderBy: [{ studioId: 'asc' }, { artistId: 'asc' }] }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    specialities,
    tattooArtists,
    artistAvailability,
    tattooStudios,
    customers,
    bookings,
    projects,
    sessions,
    payments,
    paymentDestinations,
    studioCommissions,
  };

  const outDir = path.join(__dirname, 'backup');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'seed-data.json');
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Exported to ${outPath}`);
  console.log(
    `  Specialities: ${data.specialities.length}, Artists: ${data.tattooArtists.length}, Studios: ${data.tattooStudios.length}, Customers: ${data.customers.length}, Bookings: ${data.bookings.length}, Projects: ${data.projects.length}, Sessions: ${data.sessions.length}, Payments: ${data.payments.length}, PaymentDestinations: ${data.paymentDestinations.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
