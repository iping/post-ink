import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const bookingsRouter = Router();

// GET /api/bookings — list all (with artist, customer)
bookingsRouter.get('/', async (req, res) => {
  try {
    const { status, artistId, from, to } = req.query;
    const where = {};
    if (status) where.status = status;
    if (artistId) where.artistId = artistId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    const bookings = await prisma.booking.findMany({
      where,
      include: { artist: true, customer: true, studio: true, payments: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    const withTotals = bookings.map((b) => {
      const paidTotal = (b.payments || []).filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
      const totalAmount = b.totalAmount ?? 0;
      const remainingAmount = totalAmount > 0 ? Math.max(0, totalAmount - paidTotal) : null;
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
      include: { artist: true, customer: true, studio: true, payments: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const paidTotal = (booking.payments || []).filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const totalAmount = booking.totalAmount ?? 0;
    const remainingAmount = totalAmount > 0 ? Math.max(0, totalAmount - paidTotal) : null;
    res.json({ ...booking, paidTotal, remainingAmount });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/bookings
bookingsRouter.post('/', async (req, res) => {
  try {
    const { artistId, customerId, studioId, date, startTime, endTime, status, notes, totalAmount } = req.body;
    const booking = await prisma.booking.create({
      data: {
        artistId,
        customerId: customerId || null,
        studioId: studioId || null,
        date,
        startTime: startTime || '09:00',
        endTime: endTime || '17:00',
        status: status || 'pending',
        notes: notes || null,
        totalAmount: totalAmount != null ? Number(totalAmount) : null,
      },
      include: { artist: true, customer: true, studio: true, payments: true },
    });
    const paidTotal = 0;
    const remainingAmount = booking.totalAmount != null ? Math.max(0, booking.totalAmount - paidTotal) : null;
    res.status(201).json({ ...booking, paidTotal, remainingAmount });
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
    const booking = await prisma.booking.update({
      where: { id: req.params.id },
      data,
      include: { artist: true, customer: true, studio: true, payments: true },
    });
    const paidTotal = (booking.payments || []).filter((p) => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
    const totalAmount = booking.totalAmount ?? 0;
    const remainingAmount = totalAmount > 0 ? Math.max(0, totalAmount - paidTotal) : null;
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
