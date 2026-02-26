import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const studiosRouter = Router();

// GET /api/studios — list for dropdowns
studiosRouter.get('/', async (req, res) => {
  try {
    const studios = await prisma.tattooStudio.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(studios);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/studios
studiosRouter.post('/', async (req, res) => {
  try {
    const { name, address } = req.body;
    const studio = await prisma.tattooStudio.create({
      data: { name, address: address || null },
    });
    res.status(201).json(studio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
