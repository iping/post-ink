/**
 * Clear all data from the database (no reseed).
 * Run: npm run clear-data
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete in dependency order (children first)
  await prisma.payment.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.studioCommission.deleteMany({});
  await prisma.artistAvailability.deleteMany({});
  await prisma.tattooArtist.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.tattooStudio.deleteMany({});
  await prisma.speciality.deleteMany({});
  await prisma.paymentDestination.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('All data cleared.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
