import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getStudioIdOrSendError } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const paymentDestinationsRouter = Router();

const TYPES = ['Bank', 'Credit Card', 'Cash'];
const OWNER_TYPES = ['studio', 'artist'];

function buildPaymentDestinationPayload(body) {
  const { name, account, type, isActive, ownerType, studioId, artistId } = body;
  if (!name || !name.trim()) {
    const error = new Error('Name is required');
    error.statusCode = 400;
    throw error;
  }
  if (!type || !TYPES.includes(type)) {
    const error = new Error('Type must be Bank, Credit Card, or Cash');
    error.statusCode = 400;
    throw error;
  }
  if (!ownerType || !OWNER_TYPES.includes(ownerType)) {
    const error = new Error('Owner type must be studio or artist');
    error.statusCode = 400;
    throw error;
  }
  if (ownerType === 'studio' && !studioId) {
    const error = new Error('Studio is required for studio-owned accounts');
    error.statusCode = 400;
    throw error;
  }
  if (ownerType === 'artist' && !artistId) {
    const error = new Error('Artist is required for artist-owned accounts');
    error.statusCode = 400;
    throw error;
  }
  return {
    name: name.trim(),
    account: account != null ? String(account).trim() || null : null,
    type,
    ownerType,
    studioId: ownerType === 'studio' ? studioId : null,
    artistId: ownerType === 'artist' ? artistId : null,
    isActive: isActive !== false,
  };
}

paymentDestinationsRouter.get('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { activeOnly, ownerType, artistId } = req.query;
    const where = {
      OR: [
        { studioId: effectiveStudioId },
        { artist: { studioId: effectiveStudioId } },
      ],
    };
    if (activeOnly === 'true') where.isActive = true;
    if (ownerType && OWNER_TYPES.includes(ownerType)) where.ownerType = ownerType;
    if (artistId) where.artistId = artistId;
    const list = await prisma.paymentDestination.findMany({
      where,
      include: { studio: true, artist: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

paymentDestinationsRouter.get('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const item = await prisma.paymentDestination.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { studioId: effectiveStudioId },
          { artist: { studioId: effectiveStudioId } },
        ],
      },
      include: { studio: true, artist: true },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

paymentDestinationsRouter.post('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const payload = buildPaymentDestinationPayload({ ...req.body, studioId: req.body.studioId || effectiveStudioId });
    const item = await prisma.paymentDestination.create({
      data: payload,
      include: { studio: true, artist: true },
    });
    res.status(201).json(item);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

paymentDestinationsRouter.patch('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.paymentDestination.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { studioId: effectiveStudioId },
          { artist: { studioId: effectiveStudioId } },
        ],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const payload = buildPaymentDestinationPayload({
      ...existing,
      ...req.body,
      studioId: req.body.studioId !== undefined ? req.body.studioId : existing.studioId,
      artistId: req.body.artistId !== undefined ? req.body.artistId : existing.artistId,
      ownerType: req.body.ownerType !== undefined ? req.body.ownerType : existing.ownerType,
    });
    const item = await prisma.paymentDestination.update({
      where: { id: req.params.id },
      data: payload,
      include: { studio: true, artist: true },
    });
    res.json(item);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

paymentDestinationsRouter.delete('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.paymentDestination.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { studioId: effectiveStudioId },
          { artist: { studioId: effectiveStudioId } },
        ],
      },
    });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.paymentDestination.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});
