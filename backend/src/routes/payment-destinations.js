import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const paymentDestinationsRouter = Router();

const TYPES = ['Bank', 'Credit Card', 'Cash'];

paymentDestinationsRouter.get('/', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const where = activeOnly === 'true' ? { isActive: true } : {};
    const list = await prisma.paymentDestination.findMany({
      where,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

paymentDestinationsRouter.get('/:id', async (req, res) => {
  try {
    const item = await prisma.paymentDestination.findUnique({
      where: { id: req.params.id },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

paymentDestinationsRouter.post('/', async (req, res) => {
  try {
    const { name, account, type, isActive } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!type || !TYPES.includes(type)) return res.status(400).json({ error: 'Type must be Bank, Credit Card, or Cash' });
    const item = await prisma.paymentDestination.create({
      data: {
        name: name.trim(),
        account: account != null ? String(account).trim() || null : null,
        type,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

paymentDestinationsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, account, type, isActive } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (account !== undefined) data.account = account != null ? String(account).trim() || null : null;
    if (type !== undefined) {
      if (!TYPES.includes(type)) return res.status(400).json({ error: 'Type must be Bank, Credit Card, or Cash' });
      data.type = type;
    }
    if (isActive !== undefined) data.isActive = isActive !== false;
    const item = await prisma.paymentDestination.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});

paymentDestinationsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.paymentDestination.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Not found' });
    res.status(500).json({ error: e.message });
  }
});
