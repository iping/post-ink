export const PRICE_PER_ARTIST_SLOT_IDR = 250000;
export const PRORATE_DIVISOR_DAYS = 25;
const PENDING_EXPIRY_DAYS = 7;

export const SLOT_PURCHASE_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  EXPIRED: 'expired',
};

export function computeSlotPurchaseAmount(slots, remainingDays) {
  const n = Math.max(1, Math.floor(Number(slots) || 0));
  const days = Math.max(0, Math.floor(Number(remainingDays) || 0));
  const effectiveDays = Math.min(days, PRORATE_DIVISOR_DAYS);
  const dailyRate = PRICE_PER_ARTIST_SLOT_IDR / PRORATE_DIVISOR_DAYS;
  const amountPerSlot = dailyRate * effectiveDays;
  const amount = amountPerSlot * n;
  return {
    slots: n,
    remainingDays: days,
    dailyRate,
    amountPerSlot,
    amount,
  };
}

export function daysUntilDate(nextBillingDate) {
  if (!nextBillingDate) return 0;
  const target = new Date(`${String(nextBillingDate).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.max(0, Math.floor(diffMs / 86400000));
}

export function pendingExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + PENDING_EXPIRY_DAYS);
  return d;
}

export async function expireStaleArtistSlotPurchases(prisma, studioId) {
  const now = new Date();
  await prisma.artistSlotPurchase.updateMany({
    where: {
      studioId,
      status: SLOT_PURCHASE_STATUS.PENDING_PAYMENT,
      expiresAt: { lt: now },
    },
    data: { status: SLOT_PURCHASE_STATUS.EXPIRED },
  });
}

/**
 * subscriptionUserCount + sum(paid addon slots) = max artists allowed.
 */
export async function getArtistCapacity(prisma, studioId) {
  await expireStaleArtistSlotPurchases(prisma, studioId);
  const studio = await prisma.tattooStudio.findUnique({ where: { id: studioId } });
  if (!studio) return null;

  const baseSeats = Math.max(0, Math.floor(Number(studio.subscriptionUserCount) || 0));
  const paidAgg = await prisma.artistSlotPurchase.aggregate({
    where: { studioId, status: SLOT_PURCHASE_STATUS.PAID },
    _sum: { slots: true },
  });
  const paidAddonSlots = Math.max(0, paidAgg._sum.slots || 0);
  const maxArtists = baseSeats + paidAddonSlots;

  const currentArtists = await prisma.tattooArtist.count({ where: { studioId } });

  const pendingPurchases = await prisma.artistSlotPurchase.findMany({
    where: { studioId, status: SLOT_PURCHASE_STATUS.PENDING_PAYMENT },
    orderBy: { createdAt: 'desc' },
  });

  return {
    subscriptionSeats: baseSeats,
    paidAddonSlots,
    maxArtists,
    currentArtists,
    pendingPurchases,
    hasPendingPayment: pendingPurchases.length > 0,
  };
}

/**
 * Returns { ok: true } or { ok: false, statusCode, error, code, hint, pendingPurchaseId? }.
 */
export async function assertCanAddArtist(prisma, studioId) {
  const cap = await getArtistCapacity(prisma, studioId);
  if (!cap) {
    return { ok: false, statusCode: 404, error: 'Studio not found', code: 'STUDIO_NOT_FOUND' };
  }
  if (cap.hasPendingPayment) {
    const p = cap.pendingPurchases[0];
    const exp = p.expiresAt ? new Date(p.expiresAt).toISOString().slice(0, 10) : '';
    return {
      ok: false,
      statusCode: 403,
      code: 'ARTIST_SLOT_PENDING_PAYMENT',
      error:
        'You have an artist slot add-on waiting for payment. New tattoo artists cannot be added until that transaction is marked paid or expires.',
      hint: exp
        ? `Pending: ${p.slots} slot(s), IDR ${Math.round(p.amount).toLocaleString('id-ID')}. Complete payment before ${exp}, or cancel by expiring the request.`
        : `Pending: ${p.slots} slot(s). Confirm payment in Payment Subscription → Add artist slots.`,
      pendingPurchaseId: p.id,
    };
  }
  if (cap.currentArtists < cap.maxArtists) {
    return { ok: true };
  }
  return {
    ok: false,
    statusCode: 403,
    code: 'ARTIST_SLOT_LIMIT',
    error:
      'This studio has reached its licensed artist limit. Purchase additional artist slots (Payment Subscription → Add artist slots) before adding a new tattoo artist.',
    hint: `Current artists: ${cap.currentArtists}. Maximum allowed: ${cap.maxArtists} (subscription seats ${cap.subscriptionSeats} + paid add-on slots ${cap.paidAddonSlots}).`,
  };
}
