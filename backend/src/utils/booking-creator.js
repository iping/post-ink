import { prisma } from '../lib/prisma.js';

export function normalizeCreatorEmail(email) {
  return email?.trim().toLowerCase() || null;
}

function pickStudioCreator(users) {
  if (!users?.length) return null;
  const withEmail = users.filter((u) => u.email);
  return (
    withEmail.find((u) => u.role === 'admin')
    || withEmail.find((u) => u.role === 'staff')
    || withEmail[0]
    || null
  );
}

/** Default studio user for creator fallback: admin first, then earliest staff. */
export async function findStudioDefaultCreator(studioId, db = prisma) {
  if (!studioId) return null;
  const users = await db.user.findMany({
    where: { studioId, role: { in: ['admin', 'staff'] } },
    select: { id: true, email: true, name: true, role: true },
    orderBy: [{ createdAt: 'asc' }],
  });
  return pickStudioCreator(users);
}

export async function loadStudioCreatorFallbackMap(studioIds, db = prisma) {
  const map = new Map();
  const ids = [...new Set(studioIds.filter(Boolean))];
  if (!ids.length) return map;

  const users = await db.user.findMany({
    where: { studioId: { in: ids }, role: { in: ['admin', 'staff'] } },
    select: { id: true, email: true, name: true, role: true, studioId: true },
    orderBy: [{ studioId: 'asc' }, { createdAt: 'asc' }],
  });

  for (const studioId of ids) {
    const pick = pickStudioCreator(users.filter((u) => u.studioId === studioId));
    if (pick) map.set(studioId, pick);
  }
  return map;
}

function hasCreatorEmail(booking) {
  return Boolean(
    normalizeCreatorEmail(booking.createdByEmail)
    || normalizeCreatorEmail(booking.createdBy?.email),
  );
}

export function applyCreatorFallback(booking, fallbackByStudio) {
  const directEmail =
    normalizeCreatorEmail(booking.createdByEmail)
    || normalizeCreatorEmail(booking.createdBy?.email);
  if (directEmail) {
    return { ...booking, createdByEmail: directEmail };
  }

  const fallback = booking.studioId ? fallbackByStudio.get(booking.studioId) : null;
  if (!fallback?.email) return booking;

  const email = normalizeCreatorEmail(fallback.email);
  return {
    ...booking,
    createdById: booking.createdById || fallback.id,
    createdByEmail: email,
    createdBy: booking.createdBy ?? {
      id: fallback.id,
      name: fallback.name,
      email,
    },
  };
}

export async function attachBookingCreators(bookings, db = prisma) {
  const list = Array.isArray(bookings) ? bookings : [bookings];
  const fallbackByStudio = await loadStudioCreatorFallbackMap(
    list.filter((b) => !hasCreatorEmail(b)).map((b) => b.studioId),
    db,
  );
  const enriched = list.map((b) => applyCreatorFallback(b, fallbackByStudio));
  return Array.isArray(bookings) ? enriched : enriched[0];
}
