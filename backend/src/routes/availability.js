import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { getStudioIdOrSendError } from '../middleware/auth.js';


// Mounted at /api/artists/:artistId/availability — req.params.artistId
const availabilityRouter = Router({ mergeParams: true });

// GET — list availability for artist (artist must belong to user's studio)
availabilityRouter.get('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId } = req.params;
    const artist = await prisma.tattooArtist.findFirst({ where: { id: artistId, studioId: effectiveStudioId } });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    const from = req.query.from; // optional YYYY-MM-DD
    const to = req.query.to;
    const where = { artistId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    const slots = await prisma.artistAvailability.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    res.json(slots);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST — add slot(s). Body: { date, startTime, endTime, isAvailable } or { slots: [...] }
availabilityRouter.post('/', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId } = req.params;
    const artist = await prisma.tattooArtist.findFirst({ where: { id: artistId, studioId: effectiveStudioId } });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    const slots = req.body.slots
      ? req.body.slots.map(s => ({ artistId, date: s.date, startTime: s.startTime, endTime: s.endTime, isAvailable: s.isAvailable !== false }))
      : [{ artistId, date: req.body.date, startTime: req.body.startTime, endTime: req.body.endTime, isAvailable: req.body.isAvailable !== false }];
    const created = await prisma.artistAvailability.createManyAndReturn({ data: slots });
    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /:slotId — update one slot
availabilityRouter.patch('/:slotId', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId, slotId } = req.params;
    const artist = await prisma.tattooArtist.findFirst({ where: { id: artistId, studioId: effectiveStudioId } });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    const slot = await prisma.artistAvailability.findFirst({ where: { id: slotId, artistId } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    const data = {};
    if (req.body.date != null) data.date = req.body.date;
    if (req.body.startTime != null) data.startTime = req.body.startTime;
    if (req.body.endTime != null) data.endTime = req.body.endTime;
    if (req.body.isAvailable !== undefined) data.isAvailable = req.body.isAvailable;
    const updated = await prisma.artistAvailability.update({ where: { id: slotId }, data });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /:slotId
availabilityRouter.delete('/:slotId', async (req, res) => {
  try {
    const [effectiveStudioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { artistId, slotId } = req.params;
    const artist = await prisma.tattooArtist.findFirst({ where: { id: artistId, studioId: effectiveStudioId } });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    const slot = await prisma.artistAvailability.findFirst({ where: { id: slotId, artistId } });
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    await prisma.artistAvailability.delete({ where: { id: slotId } });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export { availabilityRouter };
