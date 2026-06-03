import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';
import {
  decorateBookingFinancials,
  syncBookingReceivableCache,
} from '../utils/booking-finance.js';
import {
  attachBookingCreators,
  findStudioDefaultCreator,
  normalizeCreatorEmail,
} from '../utils/booking-creator.js';
import { getStudioIdOrSendError } from '../middleware/auth.js';

export const bookingsRouter = Router();

const bookingInclude = {
  artist: true,
  customer: true,
  studio: true,
  createdBy: { select: { id: true, name: true, email: true } },
  payments: {
    include: {
      paymentDestination: { include: { studio: true, artist: true } },
      receiverStudio: true,
      receiverArtist: true,
    },
  },
  projects: { include: { sessions: true } },
};

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

async function promoteLeadCustomer(tx, customerId) {
  if (!customerId) return;
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: { id: true, type: true },
  });
  if (customer?.type === 'lead') {
    await tx.customer.update({
      where: { id: customerId },
      data: { type: 'customer' },
    });
  }
}

// GET /api/bookings — list (scoped by studio)
bookingsRouter.get('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { status, artistId, customerId, from, to, sort } = req.query;
    const where = { studioId: effectiveStudioId };
    if (status) where.status = status;
    if (artistId) where.artistId = artistId;
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
      include: bookingInclude,
      orderBy: orderByCreation,
    });
    for (const b of bookings) {
      if (!b.shortCode) {
        const code = await ensureUniqueShortCode();
        await prisma.booking.update({ where: { id: b.id }, data: { shortCode: code } });
        b.shortCode = code;
      }
    }
    const withCreators = await attachBookingCreators(bookings);
    const withTotals = withCreators.map((b) => decorateBookingFinancials(b));
    res.json(withTotals);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/bookings/:id
bookingsRouter.get('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, studioId: effectiveStudioId },
      include: bookingInclude,
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const withCreator = await attachBookingCreators(booking);
    res.json(decorateBookingFinancials(withCreator));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/bookings
bookingsRouter.post('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId, customerId, date, startTime, endTime, notes, totalAmount, placement, preference, pricingType, projectName } = req.body;
    const shortCode = await ensureUniqueShortCode();
    const normalizedPricingType = pricingType === 'fixed' || pricingType === 'hourly' ? pricingType : null;
    const numericTotalAmount = totalAmount != null ? Number(totalAmount) : null;
    let createdById = req.user?.id ?? null;
    let createdByEmail = normalizeCreatorEmail(req.user?.email);
    if (!createdByEmail && effectiveStudioId) {
      const fallback = await findStudioDefaultCreator(effectiveStudioId);
      if (fallback) {
        createdById = createdById ?? fallback.id;
        createdByEmail = normalizeCreatorEmail(fallback.email);
      }
    }
    const data = {
      shortCode,
      artistId,
      customerId: customerId || null,
      studioId: effectiveStudioId,
      createdById,
      createdByEmail,
      date,
      startTime: startTime || '09:00',
      endTime: endTime || '17:00',
      status: 'Unpaid',
      notes: notes || null,
      totalAmount: numericTotalAmount,
      placement: placement || null,
      preference: preference || null,
      projectName: projectName || null,
    };
    if (normalizedPricingType) data.pricingType = normalizedPricingType;
    const booking = await prisma.$transaction(async (tx) => {
      await promoteLeadCustomer(tx, data.customerId);
      return tx.booking.create({
        data,
        include: bookingInclude,
      });
    });
    const withProjects = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude,
    });
    const created = withProjects || booking;
    const withCreator = await attachBookingCreators(created);
    res.status(201).json(decorateBookingFinancials(withCreator));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/bookings/:id
bookingsRouter.patch('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.booking.findFirst({ where: { id: req.params.id, studioId: effectiveStudioId } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    const body = req.body;
    const data = {};
    if (body.artistId != null) data.artistId = body.artistId;
    if (body.customerId !== undefined) data.customerId = body.customerId || null;
    // studio user cannot change studioId; super_admin could allow via body - keep same studio for simplicity
    if (body.studioId !== undefined && body.studioId !== effectiveStudioId) return res.status(403).json({ error: 'Cannot change booking studio' });
    if (body.date != null) data.date = body.date;
    if (body.startTime != null) data.startTime = body.startTime;
    if (body.endTime != null) data.endTime = body.endTime;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.totalAmount !== undefined) data.totalAmount = body.totalAmount == null ? null : Number(body.totalAmount);
    if (body.placement !== undefined) data.placement = body.placement || null;
    if (body.preference !== undefined) data.preference = body.preference || null;
    if (body.projectName !== undefined) data.projectName = body.projectName || null;
    if (body.pricingType === 'fixed' || body.pricingType === 'hourly') data.pricingType = body.pricingType;
    const booking = await prisma.$transaction(async (tx) => {
      if (data.customerId) await promoteLeadCustomer(tx, data.customerId);
      await tx.booking.update({
        where: { id: req.params.id },
        data,
        include: bookingInclude,
      });
      return syncBookingReceivableCache(tx, req.params.id);
    });
    const withCreator = await attachBookingCreators(booking);
    res.json(decorateBookingFinancials(withCreator));
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/bookings/:id
bookingsRouter.delete('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.booking.findFirst({ where: { id: req.params.id, studioId: effectiveStudioId } });
    if (!existing) return res.status(404).json({ error: 'Booking not found' });
    await prisma.booking.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Booking not found' });
    res.status(500).json({ error: e.message });
  }
});
