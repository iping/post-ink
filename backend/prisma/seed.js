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
  await prisma.payment.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.studioCommission.deleteMany({});
  await prisma.artistAvailability.deleteMany({});
  await prisma.tattooArtist.deleteMany({});
  await prisma.studioCustomer.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.tattooStudio.deleteMany({});
  await prisma.speciality.deleteMany({});
  await prisma.paymentDestination.deleteMany({});
  await prisma.user.deleteMany({});

  // ─── Studios first (tenants) ───
  const studios = await Promise.all([
    prisma.tattooStudio.create({ data: { name: 'Ink Haven Studio', address: 'Jl. Kemang Raya No. 45, Jakarta Selatan' } }),
    prisma.tattooStudio.create({ data: { name: 'Black Lotus Tattoo', address: 'Jl. Petitenget No. 12, Seminyak, Bali' } }),
    prisma.tattooStudio.create({ data: { name: 'Sacred Skin Collective', address: 'Jl. Braga No. 88, Bandung' } }),
  ]);
  const firstStudioId = studios[0].id;

  // ─── Platform users: 1 super_admin (no studio), 1 admin + staff per studio (studio column complete) ───
  const adminHash = await bcrypt.hash('admin123', await bcrypt.genSalt(10));
  await prisma.user.create({
    data: {
      email: 'superadmin@post.ink',
      passwordHash: adminHash,
      name: 'Super Admin',
      role: 'super_admin',
    },
  });
  await prisma.user.create({
    data: {
      email: 'admin@post.ink',
      passwordHash: adminHash,
      name: 'Studio Admin',
      role: 'admin',
      studioId: firstStudioId,
    },
  });
  await prisma.user.create({
    data: { email: 'staff@post.ink', passwordHash: adminHash, name: 'Staff Ink Haven', role: 'staff', studioId: firstStudioId },
  });
  await prisma.user.create({
    data: { email: 'staff2@post.ink', passwordHash: adminHash, name: 'Reception Ink Haven', role: 'staff', studioId: firstStudioId },
  });
  for (let i = 1; i < studios.length; i++) {
    await prisma.user.create({
      data: {
        email: `admin${i + 1}@post.ink`,
        passwordHash: adminHash,
        name: `Admin ${studios[i].name}`,
        role: 'admin',
        studioId: studios[i].id,
      },
    });
    await prisma.user.create({
      data: { email: `staff${i + 2}@post.ink`, passwordHash: adminHash, name: `Staff ${studios[i].name}`, role: 'staff', studioId: studios[i].id },
    });
  }

  const usedNumericIds = { customer: new Set(), project: new Set(), session: new Set() };
  function genNumericId(model) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const id = String(100000 + Math.floor(Math.random() * 900000));
      if (!usedNumericIds[model].has(id)) {
        usedNumericIds[model].add(id);
        return id;
      }
    }
    throw new Error(`Could not generate unique 6-digit id for ${model}`);
  }

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
  const SHORT_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const usedShortCodes = new Set();
  function uniqueShortCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let s = '';
      for (let i = 0; i < 5; i++) s += SHORT_CODE_CHARS[Math.floor(Math.random() * 36)];
      if (!usedShortCodes.has(s)) {
        usedShortCodes.add(s);
        return s;
      }
    }
    throw new Error('Could not generate unique short code');
  }

  // ─── Per-studio counts: artists/customers/bookings/payment accounts (each studio gets unique data) ───
  const studioCounts = [5, 7, 10];
  const leadsPerStudio = 3; // each studio gets this many leads (type=lead); the rest are customers
  const leadSources = ['instagram', 'website', 'walkin', 'whatsapp', 'referral', 'facebook'];
  const paymentMethods = ['Bank', 'Bank', 'Mandiri', 'BCA', 'Cash', 'E-Wallet'];
  // More Unpaid variety: ~half Paid, ~half Unpaid with different payment scenarios
  const bookingStatuses = ['Paid', 'Unpaid', 'Paid', 'Unpaid', 'Paid', 'Unpaid', 'Paid', 'Unpaid', 'Paid', 'Paid'];
  // For Unpaid bookings, cycle through different partial-payment scenarios
  const unpaidScenarios = ['no_payment', 'deposit_only', 'partial_final', 'pending_payment'];
  const allSpecialityNames = [
    'Fine Line', 'Botanical', 'American Traditional', 'Japanese Irezumi', 'Blackwork',
    'Neo-Traditional', 'Portrait', 'Geometric', 'Watercolor', 'Lettering',
    'Dotwork', 'Tribal', 'Realism', 'Minimalist', 'Trash Polka', 'Script', 'Cover-up', 'Floral', 'Animal', 'Sacred Geometry',
  ];
  const artistPool = [
    { name: 'Maya Chen', speciality: 'Fine Line, Botanical', rate: 750000, imgKey: 'maya' },
    { name: 'Jake Rivera', speciality: 'American Traditional', rate: 1000000, imgKey: 'jake' },
    { name: 'Luna Park', speciality: 'Japanese Irezumi', rate: 850000, imgKey: 'luna' },
    { name: 'Riko Tanaka', speciality: 'Geometric, Dotwork', rate: 900000, imgKey: 'riko' },
    { name: 'Nina Sari', speciality: 'Watercolor', rate: 650000, imgKey: 'nina' },
    { name: 'Dimas Prasetyo', speciality: 'Blackwork, Tribal', rate: 1200000, imgKey: 'dimas' },
    { name: 'Arief Gunawan', speciality: 'Portrait, Realism', rate: 1100000, imgKey: 'arief' },
    { name: 'Karin Wolff', speciality: 'Neo-Traditional', rate: 800000, imgKey: 'karin' },
    { name: 'Hendra Kusuma', speciality: 'Lettering, Script', rate: 700000, imgKey: 'hendra' },
    { name: 'Siska Maharani', speciality: 'Trash Polka', rate: 600000, imgKey: 'siska' },
    { name: 'Budi Artawan', speciality: 'Minimalist', rate: 550000, imgKey: 'maya' },
    { name: 'Dewi Tattoo', speciality: 'Floral', rate: 720000, imgKey: 'nina' },
    { name: 'Eko Inks', speciality: 'Realism', rate: 950000, imgKey: 'arief' },
    { name: 'Fina Styles', speciality: 'Dotwork', rate: 880000, imgKey: 'riko' },
    { name: 'Gilang Art', speciality: 'Tribal', rate: 780000, imgKey: 'dimas' },
    { name: 'Hana Ink', speciality: 'Portrait', rate: 920000, imgKey: 'luna' },
    { name: 'Ivan Flash', speciality: 'American Traditional', rate: 810000, imgKey: 'jake' },
    { name: 'Julia Lines', speciality: 'Fine Line', rate: 690000, imgKey: 'karin' },
    { name: 'Kevin Script', speciality: 'Lettering', rate: 660000, imgKey: 'hendra' },
    { name: 'Lia Abstract', speciality: 'Abstract', rate: 620000, imgKey: 'siska' },
    { name: 'Mario Bold', speciality: 'Blackwork', rate: 1100000, imgKey: 'dimas' },
    { name: 'Nia Color', speciality: 'Color Realism', rate: 870000, imgKey: 'nina' },
  ];
  const customerPool = [
    { name: 'Andi Pratama', email: 'andi1@gmail.com', phone: '+62 812-1000-001' },
    { name: 'Sari Dewi', email: 'sari1@gmail.com', phone: '+62 813-1000-002' },
    { name: 'Budi Santoso', email: 'budi1@gmail.com', phone: '+62 811-1000-003' },
    { name: 'Rina Wijaya', email: 'rina1@gmail.com', phone: '+62 856-1000-004' },
    { name: 'Fajar Kurniawan', email: 'fajar1@gmail.com', phone: '+62 878-1000-005' },
    { name: 'Mela Putri', email: 'mela1@gmail.com', phone: '+62 821-1000-006' },
    { name: 'Doni Hermawan', email: 'doni1@gmail.com', phone: '+62 852-1000-007' },
    { name: 'Yuni Lestari', email: 'yuni1@gmail.com', phone: '+62 819-1000-008' },
    { name: 'Tommy Adriansyah', email: 'tommy1@gmail.com', phone: '+62 815-1000-009' },
    { name: 'Dewi Anggraini', email: 'dewi1@gmail.com', phone: '+62 838-1000-010' },
    { name: 'Rizky Fadillah', email: 'rizky1@gmail.com', phone: '+62 857-1000-011' },
    { name: 'Ayu Puspita', email: 'ayu1@gmail.com', phone: '+62 822-1000-012' },
    { name: 'Kevin Wijaya', email: 'kevin1@gmail.com', phone: '+62 812-1000-013' },
    { name: 'Nadia Rahmawati', email: 'nadia1@gmail.com', phone: '+62 831-1000-014' },
    { name: 'Oscar Setiawan', email: 'oscar1@gmail.com', phone: '+62 878-1000-015' },
    { name: 'Putri Maharani', email: 'putri1@gmail.com', phone: '+62 813-1000-016' },
    { name: 'Bambang Susilo', email: 'bambang1@gmail.com', phone: '+62 822-1000-017' },
    { name: 'Citra Dewi', email: 'citra1@gmail.com', phone: '+62 857-1000-018' },
    { name: 'Dedi Kurniawan', email: 'dedi1@gmail.com', phone: '+62 819-1000-019' },
    { name: 'Eka Saputra', email: 'eka1@gmail.com', phone: '+62 852-1000-020' },
    { name: 'Fitri Handayani', email: 'fitri1@gmail.com', phone: '+62 811-1000-021' },
    { name: 'Gita Permatasari', email: 'gita1@gmail.com', phone: '+62 838-1000-022' },
  ];

  const today = new Date();
  const studioArtists = [];
  const studioCustomers = [];
  const studioStudioBca = {};
  const studioArtistDests = {};
  let artistGlobalIdx = 0;
  let customerGlobalIdx = 0;
  let unpaidScenarioIdx = 0;

  for (let sIdx = 0; sIdx < studios.length; sIdx++) {
    const studio = studios[sIdx];
    const n = studioCounts[sIdx];
    const shortStudioName = studio.name.replace(/\s+(Studio|Tattoo|Collective)$/i, '').trim();

    for (let i = 0; i < n; i++) {
      await prisma.speciality.create({ data: { studioId: studio.id, name: allSpecialityNames[(sIdx * 10 + i) % allSpecialityNames.length] } });
    }

    const artistsForStudio = [];
    for (let i = 0; i < n; i++) {
      const ap = artistPool[artistGlobalIdx % artistPool.length];
      const imgRef = img[ap.imgKey] || img.maya;
      const artist = await prisma.tattooArtist.create({
        data: {
          name: `${ap.name} (${studio.name})`,
          shortDescription: `${ap.speciality} artist at ${studio.name}.`,
          experiences: `${5 + (i % 8)} years`,
          speciality: ap.speciality,
          rate: ap.rate,
          photos: JSON.stringify([imgRef.profile]),
          portfolio: JSON.stringify([imgRef.work1, imgRef.work2]),
          studioId: studio.id,
        },
      });
      artistsForStudio.push(artist);
      artistGlobalIdx++;
    }
    studioArtists.push(artistsForStudio);

    for (const artist of artistsForStudio) {
      for (let d = 0; d < 5; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().slice(0, 10);
        for (const h of [10, 14]) {
          await prisma.artistAvailability.create({
            data: { artistId: artist.id, date: dateStr, startTime: `${String(h).padStart(2, '0')}:00`, endTime: `${String(h + 2).padStart(2, '0')}:00`, isAvailable: true },
          });
        }
      }
    }

    const studioBcaDest = await prisma.paymentDestination.create({
      data: { name: `${shortStudioName} BCA`, account: `BCA-${String(sIdx + 1).padStart(4, '0')}123456`, type: 'Bank', ownerType: 'studio', studioId: studio.id, isActive: true },
    });
    studioStudioBca[studio.id] = studioBcaDest;
    const dests = {};
    artistsForStudio.forEach((art, i) => {
      dests[art.id] = null;
    });
    for (let i = 0; i < artistsForStudio.length; i++) {
      const art = artistsForStudio[i];
      const d = await prisma.paymentDestination.create({
        data: { name: `${art.name} Mandiri`, account: `ART-${String(artistGlobalIdx - n + i).padStart(4, '0')}999`, type: 'Bank', ownerType: 'artist', artistId: art.id, isActive: true },
      });
      dests[art.id] = d;
    }
    studioArtistDests[studio.id] = dests;

    for (const artist of artistsForStudio) {
      await prisma.studioCommission.create({
        data: { studioId: studio.id, artistId: artist.id, commissionPercent: 18 + (artistGlobalIdx % 10) },
      });
    }

    // Customers + leads for this studio (names include studio so switching location shows different data)
    const customersForStudio = [];
    for (let i = 0; i < n; i++) {
      const cp = customerPool[customerGlobalIdx % customerPool.length];
      const isLead = i < leadsPerStudio;
      const referredArtist = isLead && artistsForStudio[i % artistsForStudio.length] ? artistsForStudio[i % artistsForStudio.length] : null;
      const c = await prisma.customer.create({
        data: {
          id: genNumericId('customer'),
          name: `${cp.name} · ${shortStudioName}`,
          email: cp.email.replace('1@gmail', `s${sIdx}_${i}@gmail`),
          phone: cp.phone.replace('1000', `${1000 + sIdx * 100 + i}`),
          type: isLead ? 'lead' : 'customer',
          leadSource: isLead ? leadSources[i % leadSources.length] : null,
          referredArtistId: referredArtist?.id ?? null,
          studioCustomers: { create: { studioId: studio.id } },
        },
      });
      customersForStudio.push(c);
      customerGlobalIdx++;
    }
    studioCustomers.push(customersForStudio);

    const placements = ['Forearm', 'Chest', 'Back', 'Upper arm', 'Calf', 'Thigh', 'Arm', 'Shoulder', 'Ribs', 'Wrist'];
    const amounts = [2800000, 3200000, 3500000, 4200000, 4800000, 5000000, 5500000, 3800000, 4500000, 5200000];
    const preferences = ['Floral sleeve reference from Pinterest', 'Minimalist line work', 'Japanese koi design', 'Portrait from photo', 'Geometric mandala', 'Blackwork tribal', 'Watercolor style', 'Script quote', 'Cover-up over old tattoo', 'Custom design from sketch'];
    for (let i = 0; i < n; i++) {
      const artist = artistsForStudio[i % artistsForStudio.length];
      const customer = customersForStudio[i % customersForStudio.length];
      const status = bookingStatuses[i % bookingStatuses.length];
      const amount = amounts[i % amounts.length];
      const projectName = `${shortStudioName} – ${customer.name} – ${i + 1}`;
      const booking = await prisma.booking.create({
        data: {
          shortCode: uniqueShortCode(),
          artistId: artist.id,
          customerId: customer.id,
          studioId: studio.id,
          date: futureDate(i + 1),
          startTime: i % 3 === 0 ? '09:00' : '10:00',
          endTime: i % 3 === 0 ? '11:30' : '12:00',
          status,
          pricingType: 'fixed',
          totalAmount: amount,
          placement: placements[i % placements.length],
          preference: preferences[i % preferences.length],
          projectName,
          notes: `Booking ${i + 1} at ${studio.name}.`,
        },
      });
      const dest = i % 2 === 0 ? studioBcaDest : dests[artist.id];
      const method = paymentMethods[i % paymentMethods.length];
      const isPaid = status === 'Paid';
      const receiverType = i % 2 === 0 ? 'studio' : 'artist';
      const receiverStudioId = receiverType === 'studio' ? studio.id : null;
      const receiverArtistId = receiverType === 'artist' ? artist.id : null;

      if (isPaid && dest) {
        // Fully paid: one completed final payment covering total
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            paymentDestinationId: dest.id,
            amount,
            currency: 'IDR',
            method,
            type: 'final',
            transferDestination: dest.account,
            receiverType,
            receiverStudioId,
            receiverArtistId,
            status: 'completed',
            evidenceUrl: i % 4 === 0 ? 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400' : null,
          },
        });
      } else if (!isPaid && dest) {
        // Unpaid: create different partial-payment scenarios (rotate through all 4)
        const scenario = unpaidScenarios[unpaidScenarioIdx % unpaidScenarios.length];
        unpaidScenarioIdx++;
        if (scenario === 'deposit_only') {
          // Down payment only (30% of total) — remainder still outstanding
          const depositAmount = Math.round(amount * 0.3);
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              paymentDestinationId: dest.id,
              amount: depositAmount,
              currency: 'IDR',
              method,
              type: 'down_payment',
              transferDestination: dest.account,
              receiverType,
              receiverStudioId,
              receiverArtistId,
              status: 'completed',
              evidenceUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?w=400',
            },
          });
        } else if (scenario === 'partial_final') {
          // Deposit (30%) + partial final (20%) — still short of total
          const depositAmount = Math.round(amount * 0.3);
          const partialAmount = Math.round(amount * 0.2);
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              paymentDestinationId: dest.id,
              amount: depositAmount,
              currency: 'IDR',
              method,
              type: 'down_payment',
              transferDestination: dest.account,
              receiverType,
              receiverStudioId,
              receiverArtistId,
              status: 'completed',
            },
          });
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              paymentDestinationId: dest.id,
              amount: partialAmount,
              currency: 'IDR',
              method,
              type: 'final',
              transferDestination: dest.account,
              receiverType,
              receiverStudioId,
              receiverArtistId,
              status: 'completed',
            },
          });
        } else if (scenario === 'pending_payment') {
          // Full amount recorded but payment status is pending (not yet confirmed)
          await prisma.payment.create({
            data: {
              bookingId: booking.id,
              paymentDestinationId: dest.id,
              amount,
              currency: 'IDR',
              method,
              type: 'final',
              transferDestination: dest.account,
              receiverType,
              receiverStudioId,
              receiverArtistId,
              status: 'pending',
            },
          });
        }
        // scenario === 'no_payment' → no payment record at all
      }
      const project = await prisma.project.create({
        data: {
          id: genNumericId('project'),
          bookingId: booking.id,
          name: projectName,
          pricingType: 'fixed',
          fixedAmount: amount,
          notes: 'Session 1.',
        },
      });
      const sessionCompleted = isPaid;
      await prisma.session.create({
        data: {
          id: genNumericId('session'),
          projectId: project.id,
          date: booking.date,
          startTime: booking.startTime,
          endTime: booking.endTime,
          actualHours: 2,
          notes: sessionCompleted ? 'Completed.' : 'Scheduled.',
          status: sessionCompleted ? 'completed' : 'scheduled',
          ...(sessionCompleted && {
            startedAt: new Date(new Date(booking.date).toISOString().slice(0, 10) + 'T10:00:00.000Z'),
            completedAt: new Date(new Date(booking.date).toISOString().slice(0, 10) + 'T12:00:00.000Z'),
          }),
        },
      });
    }
  }

  // ─── 15 extra bookings: Unpaid, no project started (no payment, no project/session) ───
  const EXTRA_UNPAID_NO_PROJECT = 15;
  const extraPlacements = ['Forearm', 'Chest', 'Back', 'Upper arm', 'Calf', 'Thigh', 'Arm', 'Shoulder', 'Wrist', 'Ribs'];
  const extraAmounts = [2800000, 3200000, 3500000, 4200000, 4800000, 5000000, 5500000, 3800000, 4500000, 5200000];
  const extraPreferences = ['Minimalist line work', 'Japanese koi design', 'Portrait from photo', 'Geometric mandala', 'Floral sleeve', 'Script quote', 'Cover-up', 'Custom design'];
  for (let i = 0; i < EXTRA_UNPAID_NO_PROJECT; i++) {
    const sIdx = i % studios.length;
    const studio = studios[sIdx];
    const n = studioCounts[sIdx];
    const shortStudioName = studio.name.replace(/\s+(Studio|Tattoo|Collective)$/i, '').trim();
    const artist = studioArtists[sIdx][i % n];
    const customer = studioCustomers[sIdx][i % n];
    const amount = extraAmounts[i % extraAmounts.length];
    const projectName = `${shortStudioName} – ${customer.name} – new ${i + 1}`;
    await prisma.booking.create({
      data: {
        shortCode: uniqueShortCode(),
        artistId: artist.id,
        customerId: customer.id,
        studioId: studio.id,
        date: futureDate(i + 3),
        startTime: i % 2 === 0 ? '09:00' : '14:00',
        endTime: i % 2 === 0 ? '11:00' : '16:00',
        status: 'Unpaid',
        pricingType: 'fixed',
        totalAmount: amount,
        placement: extraPlacements[i % extraPlacements.length],
        preference: extraPreferences[i % extraPreferences.length],
        projectName,
        notes: `New booking (Unpaid, project not started) ${i + 1}.`,
      },
    });
    // No payment, no project, no session — booking is Unpaid and project not started
  }

  const totalSpecialities = await prisma.speciality.count();
  const totalArtists = await prisma.tattooArtist.count();
  const totalAvailability = await prisma.artistAvailability.count();
  const totalPayments = await prisma.payment.count();
  const totalPaymentAccounts = await prisma.paymentDestination.count();
  const totalCommissions = await prisma.studioCommission.count();
  const totalCustomers = await prisma.customer.count();
  const totalBookings = await prisma.booking.count();
  const totalProjects = await prisma.project.count();
  const totalSessions = await prisma.session.count();
  const totalUsers = await prisma.user.count();
  console.log('Seed complete — per studio: 5, 7, 10 (artists, customers, bookings, etc.)');
  console.log(`  Studios: 3 | Users: ${totalUsers} | Specialities: ${totalSpecialities} | Artists: ${totalArtists} | Customers: ${totalCustomers}`);
  console.log(`  Bookings: ${totalBookings} (mixed Paid/Unpaid) | Payments: ${totalPayments} | Projects: ${totalProjects} | Sessions: ${totalSessions} | Payment destinations: ${totalPaymentAccounts} | Commissions: ${totalCommissions}`);
  console.log('  Unpaid scenarios: no_payment, deposit_only (30%), partial_final (30%+20%), pending_payment.');
  console.log(`  + ${EXTRA_UNPAID_NO_PROJECT} extra bookings: Unpaid, no project started.`);
  console.log('  Data: preferences, projectName, lead referrals, payment evidence, session timestamps.');
  console.log('Login: superadmin@post.ink or admin@post.ink / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
