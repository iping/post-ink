import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateNumericId } from '../utils/id.js';
import { syncBookingReceivableCache } from '../utils/booking-finance.js';

const prisma = new PrismaClient();
export const projectsRouter = Router();

// GET /api/projects — list all (optional ?bookingId= to filter)
projectsRouter.get('/', async (req, res) => {
  try {
    const { bookingId } = req.query;
    const where = bookingId ? { bookingId } : {};
    const projects = await prisma.project.findMany({
      where,
      include: { booking: { include: { artist: true, customer: true, studio: true } }, sessions: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/projects/:id — get one project
projectsRouter.get('/:id', async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { booking: { include: { artist: true, customer: true, studio: true } }, sessions: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/projects — create (bookingId required); creates project + first session (every project has min 1 session)
projectsRouter.post('/', async (req, res) => {
  try {
    const { bookingId, name, pricingType, fixedAmount, hourlyRate, agreedHours, notes, firstSession } = req.body;
    if (!bookingId || !name || !pricingType) {
      return res.status(400).json({ error: 'bookingId, name, and pricingType required' });
    }
    if (!['fixed', 'hourly'].includes(pricingType)) {
      return res.status(400).json({ error: 'pricingType must be "fixed" or "hourly"' });
    }
    const data = {
      bookingId,
      name: String(name).trim(),
      pricingType,
      notes: notes?.trim() || null,
    };
    if (pricingType === 'fixed') {
      data.fixedAmount = fixedAmount != null ? Number(fixedAmount) : null;
      data.hourlyRate = null;
      data.agreedHours = null;
    } else {
      data.hourlyRate = hourlyRate != null ? Number(hourlyRate) : null;
      data.agreedHours = agreedHours != null ? Number(agreedHours) : null;
      data.fixedAmount = null;
    }
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(400).json({ error: 'Booking not found' });
    const projectId = await generateNumericId(prisma, 'project');
    const projectWithSessions = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: { ...data, id: projectId },
        include: { booking: { include: { artist: true, customer: true, studio: true } }, sessions: true },
      });
      const sessionPayload = firstSession && typeof firstSession === 'object'
        ? {
            date: firstSession.date || booking.date,
            startTime: firstSession.startTime ?? booking.startTime ?? '09:00',
            endTime: firstSession.endTime ?? booking.endTime ?? '17:00',
            actualHours: firstSession.actualHours != null ? Number(firstSession.actualHours) : null,
            notes: firstSession.notes?.trim() || null,
          }
        : {
            date: booking.date,
            startTime: booking.startTime || '09:00',
            endTime: booking.endTime || '17:00',
            actualHours: null,
            notes: null,
          };
      const firstSessionId = await generateNumericId(prisma, 'session');
      await tx.session.create({
        data: {
          id: firstSessionId,
          projectId: project.id,
          date: sessionPayload.date,
          startTime: sessionPayload.startTime,
          endTime: sessionPayload.endTime,
          actualHours: sessionPayload.actualHours,
          notes: sessionPayload.notes,
        },
      });
      await syncBookingReceivableCache(tx, bookingId);
      return tx.project.findUnique({
        where: { id: project.id },
        include: { booking: { include: { artist: true, customer: true, studio: true } }, sessions: true },
      });
    });
    res.status(201).json(projectWithSessions);
  } catch (e) {
    if (e.code === 'P2003') return res.status(400).json({ error: 'Booking not found' });
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch('/:id', async (req, res) => {
  try {
    const { name, pricingType, fixedAmount, hourlyRate, agreedHours, notes } = req.body;
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Project not found' });
    const data = {};
    if (name !== undefined) data.name = String(name).trim();
    if (pricingType !== undefined) {
      if (!['fixed', 'hourly'].includes(pricingType)) {
        return res.status(400).json({ error: 'pricingType must be "fixed" or "hourly"' });
      }
      data.pricingType = pricingType;
      if (pricingType === 'fixed') {
        data.fixedAmount = fixedAmount != null ? Number(fixedAmount) : null;
        data.hourlyRate = null;
        data.agreedHours = null;
      } else {
        data.hourlyRate = hourlyRate != null ? Number(hourlyRate) : null;
        data.agreedHours = agreedHours != null ? Number(agreedHours) : null;
        data.fixedAmount = null;
      }
    } else {
      if (existing.pricingType === 'fixed' && fixedAmount !== undefined) data.fixedAmount = Number(fixedAmount);
      if (existing.pricingType === 'hourly') {
        if (hourlyRate !== undefined) data.hourlyRate = Number(hourlyRate);
        if (agreedHours !== undefined) data.agreedHours = Number(agreedHours);
      }
    }
    if (notes !== undefined) data.notes = notes?.trim() || null;
    const project = await prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: req.params.id },
        data,
        include: { booking: { include: { artist: true, customer: true, studio: true } }, sessions: true },
      });
      await syncBookingReceivableCache(tx, updated.bookingId);
      return tx.project.findUnique({
        where: { id: req.params.id },
        include: { booking: { include: { artist: true, customer: true, studio: true } }, sessions: true },
      });
    });
    res.json(project);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Project not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
    await prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id: req.params.id } });
      if (existing?.bookingId) await syncBookingReceivableCache(tx, existing.bookingId);
    });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Project not found' });
    res.status(500).json({ error: e.message });
  }
});
