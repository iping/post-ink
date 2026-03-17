import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { getStudioIdOrSendError } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const specialitiesRouter = Router();

specialitiesRouter.get('/', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const list = await prisma.speciality.findMany({
      where: { studioId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

specialitiesRouter.post('/', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const item = await prisma.speciality.create({ data: { studioId, name: name.trim() } });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Speciality already exists' });
    res.status(500).json({ error: e.message });
  }
});

specialitiesRouter.patch('/:id', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const existing = await prisma.speciality.findFirst({ where: { id: req.params.id, studioId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const item = await prisma.speciality.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    res.json(item);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Speciality already exists' });
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});

specialitiesRouter.delete('/:id', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.speciality.findFirst({ where: { id: req.params.id, studioId } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    await prisma.speciality.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});
