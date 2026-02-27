import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const specialitiesRouter = Router();

specialitiesRouter.get('/', async (req, res) => {
  try {
    const list = await prisma.speciality.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

specialitiesRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const item = await prisma.speciality.create({ data: { name: name.trim() } });
    res.status(201).json(item);
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Speciality already exists' });
    res.status(500).json({ error: e.message });
  }
});

specialitiesRouter.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
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
    await prisma.speciality.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});
