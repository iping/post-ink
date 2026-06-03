import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { isSuperAdmin, requireSuperAdmin } from '../middleware/auth.js';
import {
  computeSlotPurchaseAmount,
  daysUntilDate,
  getArtistCapacity,
  pendingExpiresAt,
  SLOT_PURCHASE_STATUS,
} from '../utils/artist-slots.js';

export const studiosRouter = Router();
const SUBSCRIPTION_CYCLES = new Set(['monthly', 'annual']);
const SUBSCRIPTION_PAYMENT_STATUSES = new Set(['unpaid', 'paid', 'overdue']);

function isoDateFromNow(daysToAdd = 30) {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

function computeSubscription({ cycle, userCount }) {
  if (!cycle && (userCount === undefined || userCount === null)) {
    return null;
  }
  if (!SUBSCRIPTION_CYCLES.has(cycle)) {
    const err = new Error('subscriptionCycle must be monthly or annual');
    err.statusCode = 400;
    throw err;
  }
  const count = Number(userCount || 0);
  if (!Number.isFinite(count) || count < 1) {
    const err = new Error('subscriptionUserCount must be at least 1');
    err.statusCode = 400;
    throw err;
  }
  const normalizedCount = Math.max(1, Math.floor(count));
  const monthlyBase = 250000 * normalizedCount;
  const amount = cycle === 'annual' ? monthlyBase * 12 * 0.8 : monthlyBase;
  return {
    subscriptionPlan: 'studio',
    subscriptionCycle: cycle,
    subscriptionUserCount: normalizedCount,
    subscriptionAmount: amount,
  };
}

function normalizeSubscriptionMeta({ paymentStatus, nextBillingDate, fallbackCycle = 'monthly' }) {
  const status = paymentStatus && SUBSCRIPTION_PAYMENT_STATUSES.has(paymentStatus)
    ? paymentStatus
    : 'unpaid';
  const nextDate = nextBillingDate && /^\d{4}-\d{2}-\d{2}$/.test(String(nextBillingDate))
    ? String(nextBillingDate)
    : isoDateFromNow(fallbackCycle === 'annual' ? 365 : 30);
  return {
    subscriptionPaymentStatus: status,
    subscriptionNextBillingDate: nextDate,
  };
}

function assertStudioAccess(req, studioId) {
  if (!isSuperAdmin(req) && req.user.studioId !== studioId) {
    return false;
  }
  return true;
}

/** Can create slot purchase or mark paid: super_admin, studio admin (not staff-only for marking paid — use admin) */
function canManageSlotPurchases(req, studioId) {
  if (isSuperAdmin(req)) return true;
  if (req.user.studioId !== studioId) return false;
  return req.user.role === 'admin' || req.user.role === 'staff';
}

function canMarkSlotPurchasePaid(req, studioId) {
  if (isSuperAdmin(req)) return true;
  if (req.user.studioId !== studioId) return false;
  return req.user.role === 'admin';
}

function canManageSubscriptionBilling(req, studioId) {
  if (isSuperAdmin(req)) return true;
  if (req.user.studioId !== studioId) return false;
  return req.user.role === 'admin';
}

// GET /api/studios/:id/artist-slot-purchases — list purchases + capacity
studiosRouter.get('/:id/artist-slot-purchases', async (req, res) => {
  try {
    const { id } = req.params;
    if (!assertStudioAccess(req, id)) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    const cap = await getArtistCapacity(prisma, id);
    if (!cap) return res.status(404).json({ error: 'Studio not found' });
    const purchases = await prisma.artistSlotPurchase.findMany({
      where: { studioId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ capacity: cap, purchases });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/studios/:id/billing-histories — billing timeline for subscription invoices
studiosRouter.get('/:id/billing-histories', async (req, res) => {
  try {
    const { id } = req.params;
    if (!assertStudioAccess(req, id)) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    const rows = await prisma.studioBillingHistory.findMany({
      where: { studioId: id },
      orderBy: [{ billingDate: 'desc' }, { createdAt: 'desc' }],
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/studios/:id/pay-subscription — record studio-level subscription payment
studiosRouter.post('/:id/pay-subscription', async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManageSubscriptionBilling(req, id)) {
      return res.status(403).json({ error: 'Only studio admin or super admin can record subscription payment' });
    }
    const studio = await prisma.tattooStudio.findUnique({ where: { id } });
    if (!studio) return res.status(404).json({ error: 'Studio not found' });

    const cycle = studio.subscriptionCycle || 'monthly';
    const userCount = studio.subscriptionUserCount || 1;
    const sub = computeSubscription({ cycle, userCount });

    const today = new Date();
    const billingDate = today.toISOString().slice(0, 10);
    const nextBillingDate = cycle === 'annual' ? isoDateFromNow(365) : isoDateFromNow(30);

    const notes = typeof req.body?.notes === 'string' && req.body.notes.trim()
      ? req.body.notes.trim()
      : 'Manual subscription payment recorded.';

    const result = await prisma.$transaction(async (tx) => {
      const history = await tx.studioBillingHistory.create({
        data: {
          studioId: id,
          billingDate,
          dueDate: studio.subscriptionNextBillingDate || billingDate,
          cycle: sub.subscriptionCycle,
          amount: sub.subscriptionAmount,
          status: 'paid',
          notes,
        },
      });
      const updatedStudio = await tx.tattooStudio.update({
        where: { id },
        data: {
          subscriptionPaymentStatus: 'paid',
          subscriptionNextBillingDate: nextBillingDate,
        },
      });
      return { studio: updatedStudio, latestHistory: history };
    });

    res.status(200).json(result);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// POST /api/studios/:id/artist-slot-purchases — request extra slots (pending_payment)
studiosRouter.post('/:id/artist-slot-purchases', async (req, res) => {
  try {
    const { id } = req.params;
    if (!canManageSlotPurchases(req, id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const slots = Number(req.body?.slots);
    if (!Number.isFinite(slots) || slots < 1 || slots > 100) {
      return res.status(400).json({ error: 'slots must be between 1 and 100' });
    }
    const existingPending = await prisma.artistSlotPurchase.findFirst({
      where: { studioId: id, status: SLOT_PURCHASE_STATUS.PENDING_PAYMENT },
    });
    if (existingPending) {
      return res.status(400).json({
        error:
          'You already have a pending artist slot purchase. Complete payment or wait until it expires before requesting another.',
        code: 'PENDING_SLOT_PURCHASE_EXISTS',
        pendingPurchaseId: existingPending.id,
      });
    }
    const studio = await prisma.tattooStudio.findUnique({ where: { id } });
    if (!studio) return res.status(404).json({ error: 'Studio not found' });
    const remainingDays = daysUntilDate(studio.subscriptionNextBillingDate);
    const { slots: n, amount, dailyRate, amountPerSlot } = computeSlotPurchaseAmount(slots, remainingDays);
    const purchase = await prisma.artistSlotPurchase.create({
      data: {
        studioId: id,
        slots: n,
        amount,
        status: SLOT_PURCHASE_STATUS.PENDING_PAYMENT,
        expiresAt: pendingExpiresAt(),
      },
    });
    res.status(201).json({
      ...purchase,
      pricing: {
        monthlyPerUser: 250000,
        divisorDays: 25,
        dailyRate,
        remainingDays,
        amountPerSlot,
        totalAmount: amount,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/studios/:id/artist-slot-purchases/:purchaseId — mark paid (or expired manually)
studiosRouter.patch('/:id/artist-slot-purchases/:purchaseId', async (req, res) => {
  try {
    const { id, purchaseId } = req.params;
    const nextStatus = req.body?.status;
    if (!assertStudioAccess(req, id)) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    if (!canMarkSlotPurchasePaid(req, id)) {
      return res.status(403).json({ error: 'Only studio admin or super admin can confirm payment or mark expired' });
    }
    if (nextStatus !== SLOT_PURCHASE_STATUS.PAID && nextStatus !== SLOT_PURCHASE_STATUS.EXPIRED) {
      return res.status(400).json({ error: 'status must be paid or expired' });
    }
    const existing = await prisma.artistSlotPurchase.findFirst({
      where: { id: purchaseId, studioId: id },
    });
    if (!existing) return res.status(404).json({ error: 'Purchase not found' });
    if (existing.status !== SLOT_PURCHASE_STATUS.PENDING_PAYMENT) {
      return res.status(400).json({ error: 'Only pending purchases can be updated' });
    }
    const purchase = await prisma.artistSlotPurchase.update({
      where: { id: purchaseId },
      data: {
        status: nextStatus,
        ...(nextStatus === SLOT_PURCHASE_STATUS.PAID ? { expiresAt: null } : {}),
      },
    });
    res.json(purchase);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/studios — list: super_admin sees all; studio user sees only their studio
studiosRouter.get('/', async (req, res) => {
  try {
    const where = isSuperAdmin(req) ? {} : { id: req.user.studioId };
    const studios = await prisma.tattooStudio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(studios);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// GET /api/studios/:id — single studio (studio user: only their studio; super_admin: any)
studiosRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req) && req.user.studioId !== id) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    const studio = await prisma.tattooStudio.findUnique({
      where: { id },
    });
    if (!studio) return res.status(404).json({ error: 'Studio not found' });
    res.json(studio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/studios/:id — update studio (studio user: only their studio; super_admin: any)
studiosRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req) && req.user.studioId !== id) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    const existing = await prisma.tattooStudio.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Studio not found' });
    const {
      name, address, photo, location, logo, mapsUrl,
      subscriptionPlan, subscriptionCycle, subscriptionUserCount, subscriptionPaymentStatus, subscriptionNextBillingDate,
    } = req.body;
    const data = {};
    if (name !== undefined) data.name = String(name).trim() || existing.name;
    if (address !== undefined) data.address = address === null || address === '' ? null : String(address).trim();
    if (photo !== undefined) data.photo = photo === null || photo === '' ? null : String(photo).trim();
    if (location !== undefined) data.location = location === null || location === '' ? null : String(location).trim();
    if (logo !== undefined) data.logo = logo === null || logo === '' ? null : String(logo).trim();
    if (mapsUrl !== undefined) data.mapsUrl = mapsUrl === null || mapsUrl === '' ? null : String(mapsUrl).trim();
    if (subscriptionPlan !== undefined || subscriptionCycle !== undefined || subscriptionUserCount !== undefined) {
      if (subscriptionPlan !== undefined && subscriptionPlan !== 'studio') {
        return res.status(400).json({ error: 'Only studio subscription is supported' });
      }
      const nextCycle = subscriptionCycle ?? existing.subscriptionCycle;
      const nextCount = subscriptionUserCount ?? existing.subscriptionUserCount;
      Object.assign(data, computeSubscription({ cycle: nextCycle, userCount: nextCount }));
    }
    if (subscriptionPaymentStatus !== undefined || subscriptionNextBillingDate !== undefined) {
      const meta = normalizeSubscriptionMeta({
        paymentStatus: subscriptionPaymentStatus ?? existing.subscriptionPaymentStatus,
        nextBillingDate: subscriptionNextBillingDate ?? existing.subscriptionNextBillingDate,
        fallbackCycle: subscriptionCycle ?? existing.subscriptionCycle ?? 'monthly',
      });
      Object.assign(data, meta);
    }
    if (Object.keys(data).length === 0) return res.json(existing);
    const studio = await prisma.tattooStudio.update({
      where: { id },
      data,
    });
    res.json(studio);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// POST /api/studios — super_admin only (create new tenant)
studiosRouter.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const {
      name, address, photo, location, logo, mapsUrl,
      subscriptionPlan, subscriptionCycle, subscriptionUserCount, subscriptionPaymentStatus, subscriptionNextBillingDate,
    } = req.body;
    if (subscriptionPlan !== undefined && subscriptionPlan !== 'studio') {
      return res.status(400).json({ error: 'Only studio subscription is supported' });
    }
    const subscriptionData = computeSubscription({
      cycle: subscriptionCycle || 'monthly',
      userCount: subscriptionUserCount || 1,
    });
    const subscriptionMeta = normalizeSubscriptionMeta({
      paymentStatus: subscriptionPaymentStatus,
      nextBillingDate: subscriptionNextBillingDate,
      fallbackCycle: subscriptionData.subscriptionCycle,
    });
    const studio = await prisma.tattooStudio.create({
      data: {
        name: name || 'New Studio',
        address: address || null,
        photo: photo || null,
        location: location || null,
        logo: logo || null,
        mapsUrl: mapsUrl || null,
        ...subscriptionData,
        ...subscriptionMeta,
      },
    });
    res.status(201).json(studio);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});
