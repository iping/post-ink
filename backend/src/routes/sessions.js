import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateNumericId } from '../utils/id.js';

const prisma = new PrismaClient();
export const sessionsRouter = Router();

// GET /api/sessions — list (optional ?projectId= to filter)
sessionsRouter.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = projectId ? { projectId } : {};
    const sessions = await prisma.session.findMany({
      where,
      include: { project: { include: { booking: { include: { artist: true, customer: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sessions/:id
sessionsRouter.get('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { project: { include: { booking: { include: { artist: true, customer: true, studio: true } } } } },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sessions — create (projectId required; every project must have at least 1 session)
sessionsRouter.post('/', async (req, res) => {
  try {
    const { projectId, date, startTime, endTime, actualHours, notes } = req.body;
    if (!projectId || !date) {
      return res.status(400).json({ error: 'projectId and date required' });
    }
    const id = await generateNumericId(prisma, 'session');
    const data = {
      id,
      projectId,
      date: String(date).trim(),
      startTime: (startTime != null && String(startTime).trim()) ? String(startTime).trim() : '09:00',
      endTime: (endTime != null && String(endTime).trim()) ? String(endTime).trim() : '17:00',
      actualHours: actualHours != null ? Number(actualHours) : null,
      notes: notes?.trim() || null,
    };
    const session = await prisma.session.create({
      data,
      include: { project: { include: { booking: { include: { artist: true, customer: true, studio: true } } } } },
    });
    res.status(201).json(session);
  } catch (e) {
    if (e.code === 'P2003') return res.status(400).json({ error: 'Project not found' });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/sessions/:id
sessionsRouter.patch('/:id', async (req, res) => {
  try {
    const { date, startTime, endTime, actualHours, notes } = req.body;
    const data = {};
    if (date !== undefined) data.date = String(date).trim();
    if (startTime !== undefined) data.startTime = String(startTime).trim();
    if (endTime !== undefined) data.endTime = String(endTime).trim();
    if (actualHours !== undefined) data.actualHours = actualHours == null ? null : Number(actualHours);
    if (notes !== undefined) data.notes = notes?.trim() || null;
    const session = await prisma.session.update({
      where: { id: req.params.id },
      data,
      include: { project: { include: { booking: { include: { artist: true, customer: true, studio: true } } } } },
    });
    res.json(session);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Session not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/sessions/:id (only if project has more than 1 session)
sessionsRouter.delete('/:id', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const count = await prisma.session.count({ where: { projectId: session.projectId } });
    if (count <= 1) {
      return res.status(400).json({ error: 'Project must have at least one session. Add another session before removing this one.' });
    }
    await prisma.session.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Session not found' });
    res.status(500).json({ error: e.message });
  }
});
