import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
export const bookingsRouter = Router();

const SHORT_CODE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function generateShortCode() {
  let s = '';
  const bytes = crypto.randomBytes(5);
  for (let i = 0; i < 5; i++) s += SHORT_CODE_CHARS[bytes[i] % 36];
  return s;
}
async function ensureUniqueShortCode() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = generateShortCode();
    const existing = await prisma.booking.findUnique({ where: { shortCode: code } });
    if (!existing) return code;
  }
  throw new Error('Could not generate unique short code');
}

/** For hourly pricing: total = sum of (hourlyRate × agreedHours) across projects (accumulative). */
function computedTotalForBooking(booking) {
  if (booking.pricingType === 'hourly' && Array.isArray(booking.projects) && booking.projects.length > 0) {
    const sum = booking.projects.reduce(
      (acc, p) => acc + (Number(p.hourlyRate) || 0) * (Number(p.agreedHours) || 0),
      0
    );
    return sum > 0 ? sum : null;
  }
  return booking.totalAmount != null ? Number(booking.totalAmount) : null;
}

// GET /api/bookings — list all (with artist, customer). Default sort: latest first.
bookingsRouter.get('/', async (req, res) => {
  try {
    const { status, artistId, studioId, customerId, from, to, sort } = req.query;
    const where = {};
    if (status) where.status = status;
    if (artistId) where.artistId = artistId;
    if (studioId) where.studioId = studioId;
    if (customerId) where.customerId = customerId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    const orderByCreation = sort === 'oldest'
      ? [{ createdAt: 'asc' }]
      : [{ createdAt: 'desc' }];
    let bookings = await prisma.booking.findMany({
      where,
      include: { artist: true, customer: true, studio: true, payments: true, review: true, projects: { include: { sessions: true } } },
      orderBy: orderByCreation,
    });
    for (const b of bookings) {
      if (!b.shortCode) {
        const code = await ensureUniqueShortCode();
        await prisma.booking.update({ where: { id: b.id }, data: { shortCode: code } });
        b.shortCode = code;
      }
    }
    const withTotals = bookings.map((b) => {
      const paidTotal = (b.payments || []).filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
      const totalAmount = computedTotalForBooking(b);
      const remainingAmount = totalAmount != null && totalAmount > 0 ? Math.max(0, totalAmount - paidTotal) : null;
      return { ...b, paidTotal, remainingAmount };
    });
    res.json(withTotals);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/bookings/:id
bookingsRouter.get('/:id', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { artist: true, customer: true, studio: true, payments: true, review: true, projects: { include: { sessions: true } } },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const paidTotal = (booking.payments || []).filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const totalAmount = computedTotalForBooking(booking);
    const remainingAmount = totalAmount != null && totalAmount > 0 ? Math.max(0, totalAmount - paidTotal) : null;
    res.json({ ...booking, paidTotal, remainingAmount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/bookings
bookingsRouter.post('/', async (req, res) => {
  try {
    const { artistId, customerId, studioId, date, startTime, endTime, status, notes, totalAmount, placement, preference, pricingType } = req.body;
    const shortCode = await ensureUniqueShortCode();
    const data = {
      shortCode,
      artistId,
      customerId: customerId || null,
      studioId: studioId || null,
      date,
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      status: status || 'pending',
      notes: notes || null,
      totalAmount: totalAmount != null ? Number(totalAmount) : null,
      placement: placement || null,
      preference: preference || null,
    };
    if (pricingType === 'fixed' || pricingType === 'hourly') data.pricingType = pricingType;
    const booking = await prisma.booking.create({
      data,
      include: { artist: true, customer: true, studio: true, payments: true },
    });
    const withProjects = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { artist: true, customer: true, studio: true, payments: true, projects: true },
    });
    const paidTotal = 0;
    const computedTotal = withProjects ? computedTotalForBooking(withProjects) : (booking.totalAmount ?? null);
    const remainingAmount = computedTotal != null ? Math.max(0, computedTotal - paidTotal) : null;
    res.status(201).json({ ...withProjects, paidTotal, remainingAmount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/bookings/:id
bookingsRouter.patch('/:id', async (req, res) => {
  try {
    const body = req.body;
    const data = {};
    if (body.artistId != null) data.artistId = body.artistId;
    if (body.customerId !== undefined) data.customerId = body.customerId || null;
    if (body.studioId !== undefined) data.studioId = body.studioId || null;
    if (body.date != null) data.date = body.date;
    if (body.startTime != null) data.startTime = body.startTime;
    if (body.endTime != null) data.endTime = body.endTime;
    if (body.status != null) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.totalAmount !== undefined) data.totalAmount = body.totalAmount == null ? null : Number(body.totalAmount);
    if (body.placement !== undefined) data.placement = body.placement || null;
    if (body.preference !== undefined) data.preference = body.preference || null;
    if (body.pricingType === 'fixed' || body.pricingType === 'hourly') data.pricingType = body.pricingType;
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { artist: true, customer: true, studio: true, payments: true, projects: true },
    });
    const paidTotal = (booking.payments || []).filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const totalAmount = computedTotalForBooking(booking);
    const remainingAmount = totalAmount != null && totalAmount > 0 ? Math.max(0, totalAmount - paidTotal) : null;
    res.json({ ...booking, paidTotal, remainingAmount });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/bookings/:id
bookingsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: e.message });
  }
});
