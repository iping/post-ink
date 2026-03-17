import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isSuperAdmin, requireSuperAdmin } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const studiosRouter = Router();

// GET /api/studios — list: super_admin sees all; studio user sees only their studio
studiosRouter.get('/', async (req, res) => {
  try {
    const where = isSuperAdmin(req) ? {} : { id: req.user.studioId };
    const studios = await prisma.tattooStudio.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(studios);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/studios/:id — single studio (studio user: only their studio; super_admin: any)
studiosRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req) && req.user.studioId !== id) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    const studio = await prisma.tattooStudio.findUnique({
      where: { id },
    });
    if (!studio) return res.status(404).json({ error: 'Studio not found' });
    res.json(studio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/studios/:id — update studio (studio user: only their studio; super_admin: any)
studiosRouter.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSuperAdmin(req) && req.user.studioId !== id) {
      return res.status(403).json({ error: 'Access denied to this studio' });
    }
    const existing = await prisma.tattooStudio.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Studio not found' });
    const { name, address } = req.body;
    const data = {};
    if (name !== undefined) data.name = String(name).trim() || existing.name;
    if (address !== undefined) data.address = address === null || address === '' ? null : String(address).trim();
    if (Object.keys(data).length === 0) return res.json(existing);
    const studio = await prisma.tattooStudio.update({
      where: { id },
      data,
    });
    res.json(studio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/studios — super_admin only (create new tenant)
studiosRouter.post('/', requireSuperAdmin, async (req, res) => {
  try {
    const { name, address } = req.body;
    const studio = await prisma.tattooStudio.create({
      data: { name: name || 'New Studio', address: address || null },
    });
    res.status(201).json(studio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
