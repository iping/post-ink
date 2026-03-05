import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const paymentsRouter = Router();

// GET /api/payments — list all (with booking)
paymentsRouter.get('/', async (req, res) => {
  try {
    const { status, bookingId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (bookingId) where.bookingId = bookingId;
    const payments = await prisma.payment.findMany({
      where,
      include: { booking: { include: { artist: true, customer: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/payments/:id
paymentsRouter.get('/:id', async (req, res) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { booking: { include: { artist: true, customer: true } } },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/payments
paymentsRouter.post('/', async (req, res) => {
  try {
    const { bookingId, amount, currency, status, method, type, transferDestination, evidenceUrl } = req.body;
    const payment = await prisma.payment.create({
      data: {
        bookingId: bookingId || null,
        amount: Number(amount),
        currency: currency || 'IDR',
        status: status || 'pending',
        method: method || null,
        type: type || null,
        transferDestination: transferDestination || null,
        evidenceUrl: evidenceUrl || null,
      },
      include: { booking: { include: { artist: true, customer: true } } },
    });
    res.status(201).json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/payments/:id
paymentsRouter.patch('/:id', async (req, res) => {
  try {
    const body = req.body;
    const data = {};
    if (body.bookingId !== undefined) data.bookingId = body.bookingId || null;
    if (body.amount != null) data.amount = Number(body.amount);
    if (body.currency != null) data.currency = body.currency;
    if (body.status != null) data.status = body.status;
    if (body.method !== undefined) data.method = body.method || null;
    if (body.type !== undefined) data.type = body.type || null;
    if (body.transferDestination !== undefined) data.transferDestination = body.transferDestination || null;
    if (body.evidenceUrl !== undefined) data.evidenceUrl = body.evidenceUrl || null;
    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data,
      include: { booking: { include: { artist: true, customer: true } } },
    });
    res.json(payment);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Payment not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/payments/:id
paymentsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Payment not found' });
    res.status(500).json({ error: e.message });
  }
});
