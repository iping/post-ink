import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.join(__dirname, '..');

const prisma = new PrismaClient();

const img = {
  maya: {
    profile: 'https://images.unsplash.com/photo-1604072366595-e75dc92d6bdc?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&h=600&fit=crop',
    work1: 'https://images.unsplash.com/photo-1590246815117-0b5fc4e3e5b4?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&h=500&fit=crop',
  },
  jake: {
    profile: 'https://images.unsplash.com/photo-1621607512214-68297480165e?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1542556398-95fb5b9f9b48?w=500&h=500&fit=crop',
    work4: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=500&h=500&fit=crop',
  },
  luna: {
    profile: 'https://images.unsplash.com/photo-1599842057874-37393e9342df?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1596704017254-9759879e0dba?w=600&h=600&fit=crop',
    work1: 'https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1586953208270-767889fa9b0f?w=500&h=500&fit=crop',
  },
  riko: {
    profile: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1542556398-95fb5b9f9b48?w=500&h=500&fit=crop',
  },
  nina: {
    profile: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1590246815117-0b5fc4e3e5b4?w=500&h=500&fit=crop',
  },
  dimas: {
    profile: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1586953208270-767889fa9b0f?w=500&h=500&fit=crop',
    work4: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=500&h=500&fit=crop',
  },
  arief: {
    profile: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1522556189639-b150ed9c4330?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1590246815117-0b5fc4e3e5b4?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1542556398-95fb5b9f9b48?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&h=500&fit=crop',
  },
  karin: {
    profile: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1586953208270-767889fa9b0f?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=500&h=500&fit=crop',
    work4: 'https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=500&h=500&fit=crop',
  },
  hendra: {
    profile: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1590246815117-0b5fc4e3e5b4?w=500&h=500&fit=crop',
  },
  siska: {
    profile: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&h=600&fit=crop&crop=face',
    profile2: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&h=600&fit=crop&crop=face',
    work1: 'https://images.unsplash.com/photo-1542556398-95fb5b9f9b48?w=500&h=500&fit=crop',
    work2: 'https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&h=500&fit=crop',
    work3: 'https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&h=500&fit=crop',
    work4: 'https://images.unsplash.com/photo-1568515045052-f9a854d70bfd?w=500&h=500&fit=crop',
  },
};

async function main() {
  execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });

  // Clean in dependency order (children first, then parents)
  await prisma.review.deleteMany({});
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

  // ─── Platform users (login to management) ───
  const adminHash = await bcrypt.hash('admin123', await bcrypt.genSalt(10));
  await prisma.user.create({
    data: {
      email: 'admin@post.ink',
      passwordHash: adminHash,
      name: 'Admin',
      role: 'admin',
    },
  });

  // ─── Specialities (master list) ───
  const specialityNames = [
    'Fine Line', 'Botanical', 'Minimalist', 'American Traditional', 'Neo-Traditional',
    'Japanese Irezumi', 'Black & Grey Realism', 'Geometric', 'Dotwork', 'Sacred Geometry',
    'Watercolor', 'Illustrative', 'Color Realism', 'Blackwork', 'Tribal', 'Polynesian',
    'Ornamental', 'Lettering', 'Cover-up', 'Portrait', 'Surrealism', 'Trash Polka',
  ];
  for (const name of specialityNames) {
    await prisma.speciality.create({ data: { name } });
  }

  // ─── Payment destinations (where booking fee can be paid) ───
  const paymentDestData = [
    { name: 'BCA', account: '1234567890', type: 'Bank', isActive: true },
    { name: 'Mandiri', account: '0987654321', type: 'Bank', isActive: true },
    { name: 'BNI', account: '1122334455', type: 'Bank', isActive: true },
    { name: 'Credit Card', account: '4111 1111 1111 1111', type: 'Credit Card', isActive: true },
    { name: 'Cash', account: null, type: 'Cash', isActive: true },
  ];
  for (const d of paymentDestData) {
    await prisma.paymentDestination.create({ data: d });
  }

  // ─── 10 Tattoo Artists ───
  const artists = [
    {
      name: 'Maya Chen',
      shortDescription: 'Award-winning artist known for intricate fine-line botanicals and delicate geometric patterns. Her work blends East Asian calligraphy influences with modern minimalism.',
      experiences: '8 years',
      speciality: 'Fine Line, Botanical, Minimalist',
      rate: 750000,
      photos: JSON.stringify([img.maya.profile, img.maya.profile2]),
      portfolio: JSON.stringify([img.maya.work1, img.maya.work2, img.maya.work3]),
    },
    {
      name: 'Jake Rivera',
      shortDescription: 'Old-school meets new-school. Jake brings bold traditional Americana to life with vibrant saturated colors and thick confident lines. Featured in Inked Magazine.',
      experiences: '12 years',
      speciality: 'American Traditional, Neo-Traditional',
      rate: 1000000,
      photos: JSON.stringify([img.jake.profile]),
      portfolio: JSON.stringify([img.jake.work1, img.jake.work2, img.jake.work3, img.jake.work4]),
    },
    {
      name: 'Luna Park',
      shortDescription: 'Specializing in large-scale Japanese irezumi and photorealistic black & grey portraits. Every piece is custom-designed through close client collaboration.',
      experiences: '6 years',
      speciality: 'Japanese Irezumi, Black & Grey Realism',
      rate: 850000,
      photos: JSON.stringify([img.luna.profile, img.luna.profile2]),
      portfolio: JSON.stringify([img.luna.work1, img.luna.work2]),
    },
    {
      name: 'Riko Tanaka',
      shortDescription: 'Geometric and dotwork specialist from Osaka. Riko creates hypnotic sacred geometry pieces, mandalas, and ornamental designs using precision hand-poke and machine techniques.',
      experiences: '10 years',
      speciality: 'Geometric, Dotwork, Sacred Geometry, Ornamental',
      rate: 900000,
      photos: JSON.stringify([img.riko.profile, img.riko.profile2]),
      portfolio: JSON.stringify([img.riko.work1, img.riko.work2, img.riko.work3]),
    },
    {
      name: 'Nina Sari',
      shortDescription: 'Watercolor and illustrative tattoo artist based in Bali. Nina\'s signature style combines soft washes of color with bold linework, creating pieces that look like paintings on skin.',
      experiences: '5 years',
      speciality: 'Watercolor, Illustrative, Color Realism',
      rate: 650000,
      photos: JSON.stringify([img.nina.profile]),
      portfolio: JSON.stringify([img.nina.work1, img.nina.work2, img.nina.work3]),
    },
    {
      name: 'Dimas Prasetyo',
      shortDescription: 'Blackwork and tribal fusion artist. Dimas draws from Polynesian, Dayak, and Mentawai tribal traditions to create bold contemporary pieces rooted in Indonesian heritage.',
      experiences: '15 years',
      speciality: 'Blackwork, Tribal, Polynesian, Cover-up',
      rate: 1200000,
      photos: JSON.stringify([img.dimas.profile, img.dimas.profile2]),
      portfolio: JSON.stringify([img.dimas.work1, img.dimas.work2, img.dimas.work3, img.dimas.work4]),
    },
    {
      name: 'Arief Gunawan',
      shortDescription: 'Photorealistic portrait specialist with a background in fine arts. Arief transforms photographs into breathtaking skin art, from celebrity likenesses to beloved family members and pets.',
      experiences: '9 years',
      speciality: 'Portrait, Realism, Black & Grey, Surrealism',
      rate: 1100000,
      photos: JSON.stringify([img.arief.profile, img.arief.profile2]),
      portfolio: JSON.stringify([img.arief.work1, img.arief.work2, img.arief.work3]),
    },
    {
      name: 'Karin Wolff',
      shortDescription: 'Berlin-trained artist who merges European illustration with Southeast Asian motifs. Known for intricate floral sleeves, whimsical animal pieces, and bold color palettes that pop.',
      experiences: '7 years',
      speciality: 'Illustrative, Floral, Color Realism, Neo-Traditional',
      rate: 800000,
      photos: JSON.stringify([img.karin.profile]),
      portfolio: JSON.stringify([img.karin.work1, img.karin.work2, img.karin.work3, img.karin.work4]),
    },
    {
      name: 'Hendra Kusuma',
      shortDescription: 'Lettering and script master. From elegant calligraphy to street-style graffiti lettering, Hendra crafts custom typography tattoos that tell stories through words and flourishes.',
      experiences: '11 years',
      speciality: 'Lettering, Script, Chicano, Calligraphy',
      rate: 700000,
      photos: JSON.stringify([img.hendra.profile, img.hendra.profile2]),
      portfolio: JSON.stringify([img.hendra.work1, img.hendra.work2, img.hendra.work3]),
      isActive: false,
    },
    {
      name: 'Siska Maharani',
      shortDescription: 'Trash Polka and abstract expressionist. Siska combines chaotic brushstrokes, newspaper clippings, and photorealism into raw, emotional compositions that defy convention.',
      experiences: '4 years',
      speciality: 'Trash Polka, Abstract, Surrealism, Mixed Media',
      rate: 600000,
      photos: JSON.stringify([img.siska.profile, img.siska.profile2]),
      portfolio: JSON.stringify([img.siska.work1, img.siska.work2, img.siska.work3, img.siska.work4]),
      isActive: false,
    },
  ];

  // 1 slot = 1 hour, 9am to 9pm (12 slots per day)
  const ONE_HOUR_SLOTS = [];
  for (let h = 9; h < 21; h++) {
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    ONE_HOUR_SLOTS.push({ start, end });
  }

  // Per-artist: off days (no slots), booked days (all 12 slots unavailable), partial days (first 4 slots unavailable)
  const schedules = [
    { offDays: [0, 3], bookedDays: [1, 4, 8, 11], partialDays: [2, 5, 9, 12] },
    { offDays: [0, 1], bookedDays: [2, 6, 10], partialDays: [3, 7, 13] },
    { offDays: [0, 5], bookedDays: [1, 3, 7, 9, 12], partialDays: [4, 6, 10] },
    { offDays: [0, 6], bookedDays: [2, 5, 9, 14, 18], partialDays: [1, 6, 11, 15] },
    { offDays: [0, 1], bookedDays: [3, 7, 10, 16], partialDays: [2, 8, 13, 17] },
    { offDays: [0], bookedDays: [1, 4, 8, 11, 15, 19], partialDays: [2, 5, 9, 13, 16, 20] },
    { offDays: [0, 6], bookedDays: [1, 5, 10, 14], partialDays: [3, 7, 12, 16] },
    { offDays: [0, 1], bookedDays: [2, 6, 9, 13], partialDays: [4, 8, 11, 15] },
    { offDays: [0, 3], bookedDays: [1, 5, 8, 12, 17], partialDays: [2, 6, 10, 14, 18] },
    { offDays: [0, 1], bookedDays: [3, 7, 11, 15], partialDays: [2, 5, 9, 13, 16] },
  ];

  const createdArtists = [];
  for (let ai = 0; ai < artists.length; ai++) {
    const artist = await prisma.tattooArtist.create({ data: artists[ai] });
    createdArtists.push(artist);
    const sched = schedules[ai];

    const today = new Date();
    for (let d = 0; d < 21; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const day = date.getDay();
      if (sched.offDays.includes(day)) continue;

      const dateStr = date.toISOString().slice(0, 10);
      const isFullyBooked = sched.bookedDays.includes(d);
      const isPartial = sched.partialDays.includes(d);

      for (let si = 0; si < ONE_HOUR_SLOTS.length; si++) {
        const slot = ONE_HOUR_SLOTS[si];
        let available = true;
        if (isFullyBooked) available = false;
        else if (isPartial && si < 4) available = false; // first 4 slots (9am–1pm) unavailable on partial days

        await prisma.artistAvailability.create({
          data: { artistId: artist.id, date: dateStr, startTime: slot.start, endTime: slot.end, isAvailable: available },
        });
      }
    }
  }

  // ─── 3 Studios ───
  const studios = await Promise.all([
    prisma.tattooStudio.create({ data: { name: 'Ink Haven Studio', address: 'Jl. Kemang Raya No. 45, Jakarta Selatan' } }),
    prisma.tattooStudio.create({ data: { name: 'Black Lotus Tattoo', address: 'Jl. Petitenget No. 12, Seminyak, Bali' } }),
    prisma.tattooStudio.create({ data: { name: 'Sacred Skin Collective', address: 'Jl. Braga No. 88, Bandung' } }),
  ]);

  // ─── 15 Customers ───
  const customerData = [
    { name: 'Andi Pratama', email: 'andi@example.com', phone: '+62 812-3456-7890' },
    { name: 'Sari Dewi', email: 'sari@example.com', phone: '+62 813-9876-5432' },
    { name: 'Budi Santoso', email: 'budi@example.com', phone: '+62 811-2233-4455' },
    { name: 'Rina Wijaya', email: 'rina@example.com', phone: '+62 856-7788-9900' },
    { name: 'Fajar Kurniawan', email: 'fajar@example.com', phone: '+62 878-1122-3344' },
    { name: 'Mela Putri', email: 'mela@example.com', phone: '+62 821-5566-7788' },
    { name: 'Doni Hermawan', email: 'doni@example.com', phone: '+62 852-9900-1122' },
    { name: 'Yuni Lestari', email: 'yuni@example.com', phone: '+62 819-3344-5566' },
    { name: 'Tommy Adriansyah', email: 'tommy@example.com', phone: '+62 815-6677-8899' },
    { name: 'Dewi Anggraini', email: 'dewi.a@example.com', phone: '+62 838-0011-2233' },
    { name: 'Rizky Fadillah', email: 'rizky@example.com', phone: '+62 857-4455-6677' },
    { name: 'Ayu Puspita', email: 'ayu@example.com', phone: '+62 822-7788-9900' },
    { name: 'Kevin Wijaya', email: 'kevin@example.com', phone: '+62 812-1100-2233' },
    { name: 'Nadia Rahmawati', email: 'nadia@example.com', phone: '+62 831-3344-5566' },
    { name: 'Oscar Setiawan', email: 'oscar@example.com', phone: '+62 878-6677-8899' },
  ];
  const customers = await Promise.all(
    customerData.map((c) => prisma.customer.create({ data: c })),
  );

  const futureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };
  const pastDate = (daysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };
  const METHODS = ['BCA', 'Mandiri', 'BNI', 'Credit Card', 'Cash'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const SHORT_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const usedShortCodes = new Set();
  function generateShortCode() {
    let s = '';
    for (let i = 0; i < 5; i++) s += SHORT_CODE_CHARS[Math.floor(Math.random() * 36)];
    return s;
  }
  function uniqueShortCode() {
    for (let attempt = 0; attempt < 50; attempt++) {
      const code = generateShortCode();
      if (!usedShortCodes.has(code)) {
        usedShortCodes.add(code);
        return code;
      }
    }
    throw new Error('Could not generate unique short code in seed');
  }

  // ─── Active Bookings (pending / confirmed) with placement and clear notes ───
  const activeBookings = [
    { artistIdx: 0, customerIdx: 0, studioIdx: 0, days: 1, start: '10:00', end: '12:00', status: 'confirmed', amount: 5000000, placement: 'Forearm', notes: 'Half sleeve botanical — wildflowers. Customer sent reference images.' },
    { artistIdx: 1, customerIdx: 1, studioIdx: 0, days: 1, start: '14:00', end: '17:00', status: 'pending', amount: 3500000, placement: 'Chest', notes: 'Traditional eagle & roses. Agreed on design in consultation.' },
    { artistIdx: 2, customerIdx: 8, studioIdx: 0, days: 2, start: '09:00', end: '12:30', status: 'confirmed', amount: 4800000, placement: 'Back', notes: 'Japanese dragon back piece — first of 3 sessions. Outline today.' },
    { artistIdx: 3, customerIdx: 9, studioIdx: 2, days: 3, start: '10:00', end: '13:00', status: 'pending', amount: 3200000, placement: 'Forearm', notes: 'Geometric band with fibonacci spiral. Single session.' },
    { artistIdx: 4, customerIdx: 10, studioIdx: 1, days: 2, start: '11:00', end: '14:00', status: 'confirmed', amount: 2800000, placement: 'Shoulder', notes: 'Watercolor phoenix. Deposit received via BCA.' },
    { artistIdx: 5, customerIdx: 11, studioIdx: 0, days: 4, start: '09:00', end: '14:00', status: 'confirmed', amount: 9500000, placement: 'Arm', notes: 'Full sleeve Polynesian tribal — session 2 of 4. Shading block.' },
    { artistIdx: 6, customerIdx: 12, studioIdx: 2, days: 3, start: '09:00', end: '13:00', status: 'pending', amount: 5500000, placement: 'Upper arm', notes: 'Photorealistic portrait. Customer will send high-res photo.' },
    { artistIdx: 7, customerIdx: 13, studioIdx: 1, days: 5, start: '10:00', end: '14:00', status: 'confirmed', amount: 4200000, placement: 'Thigh', notes: 'Neo-traditional fox with floral wreath. Design approved.' },
    { artistIdx: 8, customerIdx: 14, studioIdx: 0, days: 4, start: '10:00', end: '13:00', status: 'pending', amount: 3000000, placement: 'Forearm', notes: 'Script "Strength" with ornamental frame. Font chosen.' },
    { artistIdx: 9, customerIdx: 2, studioIdx: 2, days: 6, start: '11:00', end: '15:00', status: 'confirmed', amount: 3800000, placement: 'Calf', notes: 'Trash Polka compass with red splatter. Second session for color.' },
  ];

  const createdActiveBookings = [];
  for (const ab of activeBookings) {
    const booking = await prisma.booking.create({
      data: {
        shortCode: uniqueShortCode(),
        artistId: createdArtists[ab.artistIdx].id,
        customerId: customers[ab.customerIdx].id,
        studioId: studios[ab.studioIdx].id,
        date: futureDate(ab.days),
        startTime: ab.start,
        endTime: ab.end,
        status: ab.status,
        pricingType: 'fixed',
        totalAmount: ab.amount,
        placement: ab.placement || null,
        notes: ab.notes,
      },
    });
    createdActiveBookings.push(booking);

    if (ab.status === 'confirmed') {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: Math.round(ab.amount * 0.3),
          currency: 'IDR',
          method: pick(METHODS),
          type: 'down_payment',
          transferDestination: pick(['BCA 1234567890', 'Mandiri 0987654321', 'BNI 5566778899', null]),
          status: 'completed',
        },
      });
    }
  }

  // ─── Projects + Sessions (each project has min 1 session); names from booking context ───
  // First active booking: one fixed project + first session
  if (createdActiveBookings.length > 0) {
    const b0 = createdActiveBookings[0];
    const artist0 = createdArtists[activeBookings[0].artistIdx];
    const customer0 = customers[activeBookings[0].customerIdx];
    const month0 = b0.date ? new Date(b0.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    const projectName0 = [artist0.name.split(/\s+/).map((n) => n[0]).join(''), customer0.name, month0].filter(Boolean).join(' – ');
    const p1 = await prisma.project.create({
      data: {
        bookingId: b0.id,
        name: projectName0,
        pricingType: 'fixed',
        fixedAmount: b0.totalAmount ?? 5000000,
        notes: 'Half sleeve botanical — agreed total. First session: outline and base shading.',
      },
    });
    await prisma.session.create({
      data: {
        projectId: p1.id,
        date: b0.date,
        startTime: b0.startTime || '09:00',
        endTime: b0.endTime || '17:00',
        actualHours: 2,
        notes: 'Outline and wildflower details. Client comfortable, no touch-ups needed.',
      },
    });
  }
  // Second active booking: hourly, 2 projects each with 1 session
  if (createdActiveBookings.length > 1) {
    const hourlyBooking = createdActiveBookings[1];
    const artistForHourly = createdArtists[activeBookings[1].artistIdx];
    const customerH = customers[activeBookings[1].customerIdx];
    const rate = artistForHourly.rate ?? 500000;
    const monthH = hourlyBooking.date ? new Date(hourlyBooking.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
    const baseName = [artistForHourly.name.split(/\s+/).map((n) => n[0]).join(''), customerH.name, monthH].filter(Boolean).join(' – ');
    await prisma.booking.update({
      where: { id: hourlyBooking.id },
      data: { pricingType: 'hourly', totalAmount: null },
    });
    const p2 = await prisma.project.create({
      data: {
        bookingId: hourlyBooking.id,
        name: baseName + ' (Session 1)',
        pricingType: 'hourly',
        hourlyRate: rate,
        agreedHours: 2,
        notes: 'Traditional eagle — outline and black fill. Session 1 of 2.',
      },
    });
    await prisma.session.create({
      data: {
        projectId: p2.id,
        date: hourlyBooking.date,
        startTime: hourlyBooking.startTime || '09:00',
        endTime: hourlyBooking.endTime || '17:00',
        actualHours: 2,
        notes: 'Eagle outline completed. Next session: roses and color.',
      },
    });
    const p3 = await prisma.project.create({
      data: {
        bookingId: hourlyBooking.id,
        name: baseName + ' (Session 2)',
        pricingType: 'hourly',
        hourlyRate: rate,
        agreedHours: 1.5,
        notes: 'Roses and shading. Final session for this piece.',
      },
    });
    await prisma.session.create({
      data: {
        projectId: p3.id,
        date: hourlyBooking.date,
        startTime: '14:00',
        endTime: '17:00',
        actualHours: 1.5,
        notes: 'Roses and background shading. Client very happy.',
      },
    });
  }

  // ─── Cancelled Bookings ───
  const cancelledBookings = [
    { artistIdx: 1, customerIdx: 3, studioIdx: 0, daysAgo: 5, start: '14:00', end: '17:00', amount: 4000000, notes: 'Traditional anchor — customer rescheduled' },
    { artistIdx: 4, customerIdx: 6, studioIdx: 1, daysAgo: 8, start: '11:00', end: '14:00', amount: 2500000, notes: 'Watercolor butterfly — cancelled by customer' },
    { artistIdx: 8, customerIdx: 10, studioIdx: 0, daysAgo: 12, start: '14:00', end: '17:00', amount: 2800000, notes: 'Chicano lettering — customer no-show' },
  ];

  for (const cb of cancelledBookings) {
    const booking = await prisma.booking.create({
      data: {
        shortCode: uniqueShortCode(),
        artistId: createdArtists[cb.artistIdx].id,
        customerId: customers[cb.customerIdx].id,
        studioId: studios[cb.studioIdx].id,
        date: pastDate(cb.daysAgo),
        startTime: cb.start,
        endTime: cb.end,
        status: 'cancelled',
        pricingType: 'fixed',
        totalAmount: cb.amount,
        notes: cb.notes,
      },
    });
    // Refunded down payment for first cancelled
    if (cb === cancelledBookings[0]) {
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: 1200000, currency: 'IDR', method: 'BCA', type: 'down_payment', status: 'refunded' },
      });
    }
  }

  // ─── Completed Bookings with Reviews (spread across all 10 artists & 3 studios) ───
  const completedBookings = [
    { artistIdx: 0, customerIdx: 2, studioIdx: 0, daysAgo: 14, start: '09:00', end: '12:00', amount: 4500000, notes: 'Delicate peony sleeve — inner forearm', rating: 5, comment: 'Maya is incredibly talented! The fine-line work is so precise and beautiful. She took the time to understand exactly what I wanted and the result exceeded my expectations.' },
    { artistIdx: 0, customerIdx: 3, studioIdx: 0, daysAgo: 28, start: '13:00', end: '16:00', amount: 3800000, notes: 'Geometric mandala with botanical elements', rating: 5, comment: 'Absolutely stunning work. Maya has such a steady hand and the level of detail is remarkable.' },
    { artistIdx: 0, customerIdx: 4, studioIdx: 0, daysAgo: 45, start: '10:00', end: '13:00', amount: 5200000, notes: 'Minimalist wildflower bouquet — ribcage', rating: 4, comment: 'Beautiful work, very delicate and exactly the style I was looking for. The end result is perfect.' },
    { artistIdx: 1, customerIdx: 0, studioIdx: 0, daysAgo: 7, start: '10:00', end: '14:00', amount: 6000000, notes: 'Traditional panther on thigh', rating: 5, comment: 'Jake is the GOAT of traditional tattooing. Bold lines, perfect color saturation. The panther looks like it\'s about to jump off my skin!' },
    { artistIdx: 1, customerIdx: 5, studioIdx: 0, daysAgo: 21, start: '14:00', end: '18:00', amount: 7500000, notes: 'Neo-traditional rose and dagger — full forearm', rating: 4, comment: 'Really solid work. Jake knows his craft and the colors are vibrant.' },
    { artistIdx: 1, customerIdx: 6, studioIdx: 0, daysAgo: 35, start: '11:00', end: '15:00', amount: 5500000, notes: 'American traditional eagle chest piece', rating: 5, comment: 'Incredible experience from start to finish. Jake\'s design was even better than what I had in mind.' },
    { artistIdx: 2, customerIdx: 1, studioIdx: 0, daysAgo: 10, start: '09:00', end: '12:30', amount: 5000000, notes: 'Japanese koi fish half sleeve', rating: 5, comment: 'Luna\'s Japanese work is on another level. The flow of the koi with the water and waves is seamless.' },
    { artistIdx: 2, customerIdx: 7, studioIdx: 0, daysAgo: 30, start: '14:00', end: '17:00', amount: 4200000, notes: 'Black and grey portrait of my dog', rating: 4, comment: 'The realism is amazing — it looks exactly like my dog! Luna captured every little detail.' },
    { artistIdx: 3, customerIdx: 3, studioIdx: 2, daysAgo: 5, start: '10:00', end: '13:00', amount: 4000000, notes: 'Sacred geometry sleeve — upper arm', rating: 5, comment: 'Riko\'s precision is mind-blowing. Every line is perfectly straight, every dot perfectly placed.' },
    { artistIdx: 3, customerIdx: 6, studioIdx: 2, daysAgo: 18, start: '14:00', end: '17:00', amount: 3500000, notes: 'Dotwork mandala on back', rating: 5, comment: 'The mandala is absolutely perfect. Riko spent hours getting every single dot just right.' },
    { artistIdx: 4, customerIdx: 0, studioIdx: 1, daysAgo: 12, start: '11:00', end: '14:00', amount: 3200000, notes: 'Watercolor hummingbird on shoulder', rating: 4, comment: 'Nina\'s watercolor technique is beautiful. The colors blend so naturally.' },
    { artistIdx: 4, customerIdx: 7, studioIdx: 1, daysAgo: 25, start: '15:00', end: '18:00', amount: 2800000, notes: 'Illustrative cat portrait with flowers', rating: 5, comment: 'I\'m in love with this tattoo! Nina perfectly captured my cat\'s personality with the illustrative style.' },
    { artistIdx: 5, customerIdx: 2, studioIdx: 0, daysAgo: 3, start: '09:00', end: '14:00', amount: 8500000, notes: 'Polynesian tribal half sleeve with Dayak motifs', rating: 5, comment: 'Dimas is a master of tribal work. He incorporated both Polynesian and Dayak elements seamlessly.' },
    { artistIdx: 5, customerIdx: 4, studioIdx: 0, daysAgo: 15, start: '13:00', end: '17:00', amount: 6000000, notes: 'Blackwork cover-up — old tattoo on forearm', rating: 5, comment: 'Dimas transformed my terrible old tattoo into something incredible. His cover-up skills are legendary.' },
    { artistIdx: 5, customerIdx: 5, studioIdx: 0, daysAgo: 40, start: '10:00', end: '15:00', amount: 7200000, notes: 'Full back Mentawai tribal pattern', rating: 4, comment: 'Massive piece that took multiple sessions. Dimas was patient and the final result is powerful.' },
    { artistIdx: 6, customerIdx: 8, studioIdx: 2, daysAgo: 6, start: '09:00', end: '13:00', amount: 6500000, notes: 'Photorealistic portrait of grandmother', rating: 5, comment: 'Arief captured my grandmother\'s smile perfectly. The detail in the eyes is extraordinary. I cried when I saw the result. A true master of realism.' },
    { artistIdx: 6, customerIdx: 9, studioIdx: 2, daysAgo: 20, start: '13:00', end: '17:00', amount: 5800000, notes: 'Surrealist melting clock with eye', rating: 5, comment: 'Arief turned my Salvador Dali inspiration into something uniquely mine. The depth and shading are insane.' },
    { artistIdx: 6, customerIdx: 14, studioIdx: 2, daysAgo: 42, start: '10:00', end: '14:00', amount: 7000000, notes: 'Black & grey lion portrait on chest', rating: 4, comment: 'The lion looks incredibly lifelike. Arief\'s shading technique creates amazing depth. Solid work.' },
    { artistIdx: 7, customerIdx: 10, studioIdx: 1, daysAgo: 8, start: '10:00', end: '14:00', amount: 4500000, notes: 'Neo-traditional wolf with wildflower crown', rating: 5, comment: 'Karin\'s use of color is unlike anything I\'ve seen. The wolf looks majestic with the floral elements. Absolutely breathtaking!' },
    { artistIdx: 7, customerIdx: 11, studioIdx: 1, daysAgo: 22, start: '14:00', end: '18:00', amount: 5000000, notes: 'Illustrative bird of paradise full sleeve', rating: 5, comment: 'Karin designed the most beautiful sleeve I could imagine. Every angle reveals new details. Worth flying to Bali for!' },
    { artistIdx: 7, customerIdx: 13, studioIdx: 1, daysAgo: 38, start: '10:00', end: '13:00', amount: 3500000, notes: 'Colorful botanical wrist band', rating: 4, comment: 'The colors are vibrant and the design wraps my wrist perfectly. Karin has a great eye for placement.' },
    { artistIdx: 8, customerIdx: 12, studioIdx: 0, daysAgo: 9, start: '10:00', end: '13:00', amount: 3000000, notes: 'Arabic calligraphy script on forearm', rating: 5, comment: 'Hendra\'s lettering is flawless. The Arabic script flows beautifully and the line weight variation is masterful.' },
    { artistIdx: 8, customerIdx: 1, studioIdx: 0, daysAgo: 24, start: '14:00', end: '18:00', amount: 3800000, notes: 'Chicano-style "Family First" with roses', rating: 5, comment: 'The Chicano style lettering is authentic and clean. Hendra added roses and filigree that tied it all together. True artistry.' },
    { artistIdx: 8, customerIdx: 4, studioIdx: 0, daysAgo: 50, start: '10:00', end: '14:00', amount: 4200000, notes: 'Full chest "Through Hell and Back" script', rating: 4, comment: 'Bold lettering that reads perfectly from every angle. Hendra took time to adjust sizing and spacing. Great results.' },
    { artistIdx: 9, customerIdx: 3, studioIdx: 2, daysAgo: 4, start: '11:00', end: '15:00', amount: 3500000, notes: 'Trash Polka heart with geometric fragments', rating: 5, comment: 'Siska\'s Trash Polka is raw and emotional. The contrast between the realistic heart and the abstract splatter is powerful.' },
    { artistIdx: 9, customerIdx: 5, studioIdx: 2, daysAgo: 16, start: '15:00', end: '19:00', amount: 4000000, notes: 'Abstract expressionist raven full back', rating: 4, comment: 'The raven looks both beautiful and chaotic — exactly what I wanted. Siska has a unique vision that stands out.' },
    { artistIdx: 9, customerIdx: 14, studioIdx: 2, daysAgo: 32, start: '12:00', end: '16:00', amount: 3200000, notes: 'Mixed media compass with newspaper texture', rating: 5, comment: 'Unlike any tattoo I\'ve ever seen. The newspaper texture and red accents make it look like a living collage on my arm.' },
  ];

  let reviewCount = 0;
  for (const cb of completedBookings) {
    const booking = await prisma.booking.create({
      data: {
        shortCode: uniqueShortCode(),
        artistId: createdArtists[cb.artistIdx].id,
        customerId: customers[cb.customerIdx].id,
        studioId: studios[cb.studioIdx].id,
        date: pastDate(cb.daysAgo),
        startTime: cb.start,
        endTime: cb.end,
        status: 'completed',
        pricingType: 'fixed',
        totalAmount: cb.amount,
        notes: cb.notes,
      },
    });

    // Full payment for completed bookings (some with split down_payment + final)
    if (reviewCount % 3 === 0) {
      const dp = Math.round(cb.amount * 0.3);
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: dp, currency: 'IDR', method: pick(METHODS), type: 'down_payment', transferDestination: pick(['BCA 1234567890', 'Mandiri 0987654321', 'BNI 5566778899']), status: 'completed' },
      });
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: cb.amount - dp, currency: 'IDR', method: 'Cash', type: 'final', status: 'completed' },
      });
    } else {
      await prisma.payment.create({
        data: { bookingId: booking.id, amount: cb.amount, currency: 'IDR', method: pick(METHODS), type: 'final', status: 'completed' },
      });
    }

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        artistId: createdArtists[cb.artistIdx].id,
        customerId: customers[cb.customerIdx].id,
        rating: cb.rating,
        comment: cb.comment,
      },
    });
    reviewCount++;
  }

  // ─── Commission agreements (across studios) ───
  const commissionRates = [20, 25, 20, 22, 18, 25, 23, 20, 18, 15];
  for (let i = 0; i < createdArtists.length; i++) {
    // Each artist has commission with their primary studio
    const primaryStudio = i < 6 ? 0 : i < 8 ? 1 : 2;
    await prisma.studioCommission.create({
      data: { studioId: studios[primaryStudio].id, artistId: createdArtists[i].id, commissionPercent: commissionRates[i] },
    });
    // Some artists also work at a second studio
    if (i % 3 === 0 && primaryStudio !== 2) {
      await prisma.studioCommission.create({
        data: { studioId: studios[2].id, artistId: createdArtists[i].id, commissionPercent: commissionRates[i] + 5 },
      });
    }
  }

  const totalBookings = activeBookings.length + cancelledBookings.length + completedBookings.length;
  const totalProjects = await prisma.project.count();
  const totalPayments = await prisma.payment.count();
  console.log(`Seed complete: ${createdArtists.length} artists, ${studios.length} studios, ${customers.length} customers, ${totalBookings} bookings, ${totalProjects} projects, ${totalPayments} payments, ${reviewCount} reviews.`);
  console.log('Default login: admin@post.ink / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
