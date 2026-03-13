import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { RECEIVER_TYPES, syncBookingReceivableCache } from '../utils/booking-finance.js';

const prisma = new PrismaClient();
export const paymentsRouter = Router();

async function getPaymentInclude() {
  return {
    booking: {
      include: {
        artist: true,
        customer: true,
        studio: true,
        projects: { include: { sessions: true } },
      },
    },
    paymentDestination: { include: { studio: true, artist: true } },
    receiverStudio: true,
    receiverArtist: true,
  };
}

async function buildPaymentPayload(tx, body, existingPayment = null) {
  const data = {};
  if (body.bookingId !== undefined) data.bookingId = body.bookingId || null;
  if (body.amount != null) data.amount = Number(body.amount);
  if (body.currency != null) data.currency = body.currency;
  if (body.status != null) data.status = body.status;
  if (body.type !== undefined) data.type = body.type || null;
  if (body.evidenceUrl !== undefined) data.evidenceUrl = body.evidenceUrl || null;

  const bookingId = data.bookingId !== undefined ? data.bookingId : existingPayment?.bookingId || null;
  const booking = bookingId
    ? await tx.booking.findUnique({
        where: { id: bookingId },
        include: { artist: true, studio: true, payments: true, projects: true },
      })
    : null;

  const destinationId = body.paymentDestinationId !== undefined
    ? body.paymentDestinationId || null
    : existingPayment?.paymentDestinationId || null;

  let destination = null;
  if (destinationId) {
    destination = await tx.paymentDestination.findUnique({
      where: { id: destinationId },
      include: { studio: true, artist: true },
    });
    if (!destination) {
      const error = new Error('Payment destination not found');
      error.statusCode = 400;
      throw error;
    }
    if (!destination.isActive) {
      const error = new Error('Payment destination is inactive');
      error.statusCode = 400;
      throw error;
    }
  }

  const receiverType = body.receiverType !== undefined
    ? body.receiverType || null
    : existingPayment?.receiverType || destination?.ownerType || null;

  if (!receiverType || !RECEIVER_TYPES.has(receiverType)) {
    const error = new Error('Receiver type must be studio or artist');
    error.statusCode = 400;
    throw error;
  }

  if (destination && destination.ownerType !== receiverType) {
    const error = new Error('Payment destination owner must match receiver type');
    error.statusCode = 400;
    throw error;
  }

  let receiverStudioId = null;
  let receiverArtistId = null;
  if (receiverType === 'studio') {
    receiverStudioId = body.receiverStudioId !== undefined
      ? body.receiverStudioId || null
      : existingPayment?.receiverStudioId || destination?.studioId || booking?.studioId || null;
    if (!receiverStudioId) {
      const error = new Error('Studio receiver is required');
      error.statusCode = 400;
      throw error;
    }
    if (booking?.studioId && booking.studioId !== receiverStudioId) {
      const error = new Error('Receiver studio must match the booking studio');
      error.statusCode = 400;
      throw error;
    }
  }
  if (receiverType === 'artist') {
    receiverArtistId = body.receiverArtistId !== undefined
      ? body.receiverArtistId || null
      : existingPayment?.receiverArtistId || destination?.artistId || booking?.artistId || null;
    if (!receiverArtistId) {
      const error = new Error('Artist receiver is required');
      error.statusCode = 400;
      throw error;
    }
    if (booking?.artistId && booking.artistId !== receiverArtistId) {
      const error = new Error('Receiver artist must match the booking artist');
      error.statusCode = 400;
      throw error;
    }
  }

  if (destination) {
    data.paymentDestinationId = destination.id;
    data.method = destination.type;
    data.transferDestination = destination.account || destination.name;
  } else {
    if (body.paymentDestinationId !== undefined) data.paymentDestinationId = null;
    if (body.method !== undefined) data.method = body.method || null;
    if (body.transferDestination !== undefined) data.transferDestination = body.transferDestination || null;
  }

  data.receiverType = receiverType;
  data.receiverStudioId = receiverStudioId;
  data.receiverArtistId = receiverArtistId;

  return data;
}

// GET /api/payments — list all (with booking)
paymentsRouter.get('/', async (req, res) => {
  try {
    const { status, bookingId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (bookingId) where.bookingId = bookingId;
    const payments = await prisma.payment.findMany({
      where,
      include: await getPaymentInclude(),
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
      include: await getPaymentInclude(),
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
    const payment = await prisma.$transaction(async (tx) => {
      const data = await buildPaymentPayload(tx, req.body);
      if (!Number.isFinite(data.amount)) {
        const error = new Error('Amount is required');
        error.statusCode = 400;
        throw error;
      }
      const created = await tx.payment.create({
        data: {
          bookingId: data.bookingId || null,
          amount: data.amount,
          currency: data.currency || 'IDR',
          status: data.status || 'pending',
          method: data.method || null,
          type: data.type || null,
          transferDestination: data.transferDestination || null,
          paymentDestinationId: data.paymentDestinationId || null,
          receiverType: data.receiverType,
          receiverStudioId: data.receiverStudioId || null,
          receiverArtistId: data.receiverArtistId || null,
          evidenceUrl: data.evidenceUrl || null,
        },
        include: await getPaymentInclude(),
      });
      if (created.bookingId) await syncBookingReceivableCache(tx, created.bookingId);
      return tx.payment.findUnique({
        where: { id: created.id },
        include: await getPaymentInclude(),
      });
    });
    res.status(201).json(payment);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// PATCH /api/payments/:id
paymentsRouter.patch('/:id', async (req, res) => {
  try {
    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        const error = new Error('Payment not found');
        error.code = 'P2025';
        throw error;
      }
      const data = await buildPaymentPayload(tx, req.body, existing);
      const updated = await tx.payment.update({
        where: { id: req.params.id },
        data,
        include: await getPaymentInclude(),
      });
      if (existing.bookingId) await syncBookingReceivableCache(tx, existing.bookingId);
      if (updated.bookingId && updated.bookingId !== existing.bookingId) await syncBookingReceivableCache(tx, updated.bookingId);
      return tx.payment.findUnique({
        where: { id: updated.id },
        include: await getPaymentInclude(),
      });
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
    await prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { id: req.params.id } });
      await tx.payment.delete({ where: { id: req.params.id } });
      if (existing?.bookingId) await syncBookingReceivableCache(tx, existing.bookingId);
    });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Payment not found' });
    res.status(500).json({ error: e.message });
  }
});
