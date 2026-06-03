import { PrismaClient } from '@prisma/client';
import { findStudioDefaultCreator, normalizeCreatorEmail } from '../src/utils/booking-creator.js';

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    where: {
      studioId: { not: null },
      OR: [{ createdByEmail: null }, { createdByEmail: '' }],
    },
    select: { id: true, studioId: true, createdById: true },
  });

  let updated = 0;
  for (const booking of bookings) {
    if (booking.createdById) {
      const linked = await prisma.user.findUnique({
        where: { id: booking.createdById },
        select: { email: true, studioId: true },
      });
      if (linked?.email && linked.studioId === booking.studioId) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { createdByEmail: normalizeCreatorEmail(linked.email) },
        });
        updated += 1;
        continue;
      }
    }

    const fallback = await findStudioDefaultCreator(booking.studioId, prisma);
    if (!fallback?.email) continue;

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        createdById: booking.createdById ?? fallback.id,
        createdByEmail: normalizeCreatorEmail(fallback.email),
      },
    });
    updated += 1;
  }

  console.log(`Backfilled creation by for ${updated} of ${bookings.length} booking(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
