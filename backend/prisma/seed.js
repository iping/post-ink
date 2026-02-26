import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..');

const prisma = new PrismaClient();

// Placeholder images (picsum.photos) so the app shows real-looking content
const placeholder = (id, w = 400, h = 400) => `https://picsum.photos/seed/${id}/${w}/${h}`;

async function main() {
  // Ensure migrations are applied so StudioCommission and other tables exist
  execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });
  // Clear in dependency order
  await prisma.payment.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.studioCommission.deleteMany({});
  await prisma.artistAvailability.deleteMany({});
  await prisma.tattooArtist.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.tattooStudio.deleteMany({});

  const artists = [
    {
      name: 'Maya Chen',
      shortDescription: 'Award-winning artist specializing in fine-line and botanical tattoos. Based in Brooklyn.',
      experiences: '8 years',
      speciality: 'Fine Line, Botanical, Minimalist',
      photos: JSON.stringify([
        placeholder('maya1', 600, 600),
        placeholder('maya2', 600, 600),
      ]),
      portfolio: JSON.stringify([
        placeholder('maya-p1', 500, 500),
        placeholder('maya-p2', 500, 500),
        placeholder('maya-p3', 500, 500),
      ]),
    },
    {
      name: 'Jake Rivera',
      shortDescription: 'Traditional and neo-traditional tattoos. Bold lines, vibrant colors.',
      experiences: '12 years',
      speciality: 'American Traditional, Neo-Traditional',
      photos: JSON.stringify([
        placeholder('jake1', 600, 600),
      ]),
      portfolio: JSON.stringify([
        placeholder('jake-p1', 500, 500),
        placeholder('jake-p2', 500, 500),
        placeholder('jake-p3', 500, 500),
        placeholder('jake-p4', 500, 500),
      ]),
    },
    {
      name: 'Luna Park',
      shortDescription: 'Japanese and black & grey specialist. Custom designs only.',
      experiences: '6 years',
      speciality: 'Japanese, Black & Grey, Realism',
      photos: JSON.stringify([
        placeholder('luna1', 600, 600),
        placeholder('luna2', 600, 600),
      ]),
      portfolio: JSON.stringify([
        placeholder('luna-p1', 500, 500),
        placeholder('luna-p2', 500, 500),
      ]),
    },
  ];

  const createdArtists = [];
  for (const a of artists) {
    const artist = await prisma.tattooArtist.create({ data: a });
    createdArtists.push(artist);

    const today = new Date();
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().slice(0, 10);
      await prisma.artistAvailability.create({
        data: {
          artistId: artist.id,
          date: dateStr,
          startTime: '09:00',
          endTime: '17:00',
          isAvailable: true,
        },
      });
    }
  }

  const studio = await prisma.tattooStudio.create({
    data: { name: 'Ink Haven Studio', address: '123 Main St' },
  });

  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Alex Morgan', email: 'alex@example.com', phone: '+1 555-0100' } }),
    prisma.customer.create({ data: { name: 'Jordan Lee', email: 'jordan@example.com', phone: '+1 555-0101' } }),
  ]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().slice(0, 10);

  const booking1 = await prisma.booking.create({
    data: {
      artistId: createdArtists[0].id,
      customerId: customers[0].id,
      studioId: studio.id,
      date: dateStr,
      startTime: '10:00',
      endTime: '12:00',
      status: 'confirmed',
      totalAmount: 500,
      notes: 'Half sleeve consultation',
    },
  });

  await prisma.booking.create({
    data: {
      artistId: createdArtists[1].id,
      customerId: customers[1].id,
      studioId: studio.id,
      date: dateStr,
      startTime: '14:00',
      endTime: '17:00',
      status: 'pending',
      totalAmount: 400,
      notes: 'Traditional rose',
    },
  });

  await prisma.payment.create({
    data: {
      bookingId: booking1.id,
      amount: 150,
      currency: 'USD',
      method: 'BCA',
      type: 'down_payment',
      transferDestination: 'BCA 1234567890',
      status: 'completed',
    },
  });

  await prisma.studioCommission.create({
    data: {
      studioId: studio.id,
      artistId: createdArtists[0].id,
      commissionPercent: 20,
    },
  });

  await prisma.studioCommission.create({
    data: {
      studioId: studio.id,
      artistId: createdArtists[1].id,
      commissionPercent: 25,
    },
  });

  console.log('Seed complete: 3 artists, 1 studio, 2 customers, 2 bookings, 1 payment, 2 commission agreements.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
