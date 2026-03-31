import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isSuperAdmin, requireSuperAdmin } from '../middleware/auth.js';

const prisma = new PrismaClient();
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
