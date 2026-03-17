import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getStudioIdOrSendError } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const commissionsRouter = Router();

// GET /api/commissions — list (scoped by studio)
commissionsRouter.get('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId } = req.query;
    const where = { studioId: effectiveStudioId };
    if (artistId) where.artistId = artistId;
    const list = await prisma.studioCommission.findMany({
      where,
      include: { studio: true, artist: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/commissions/:id
commissionsRouter.get('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const row = await prisma.studioCommission.findFirst({
      where: { id: req.params.id, studioId: effectiveStudioId },
      include: { studio: true, artist: true },
    });
    if (!row) return res.status(404).json({ error: 'Commission not found' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/commissions
commissionsRouter.post('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId, commissionPercent } = req.body;
    const row = await prisma.studioCommission.create({
      data: {
        studioId: effectiveStudioId,
        artistId,
        commissionPercent: Number(commissionPercent),
      },
      include: { studio: true, artist: true },
    });
    res.status(201).json(row);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Commission for this artist-studio already exists' });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/commissions/:id
commissionsRouter.patch('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.studioCommission.findFirst({ where: { id: req.params.id, studioId: effectiveStudioId } });
    if (!existing) return res.status(404).json({ error: 'Commission not found' });
    const { commissionPercent } = req.body;
    const row = await prisma.studioCommission.update({
      where: { id: req.params.id },
      data: { commissionPercent: Number(commissionPercent) },
      include: { studio: true, artist: true },
    });
    res.json(row);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Commission not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/commissions/:id
commissionsRouter.delete('/:id', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.studioCommission.findFirst({ where: { id: req.params.id, studioId: effectiveStudioId } });
    if (!existing) return res.status(404).json({ error: 'Commission not found' });
    await prisma.studioCommission.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Commission not found' });
    res.status(500).json({ error: e.message });
  }
});
