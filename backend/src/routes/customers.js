import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateNumericId } from '../utils/id.js';

const prisma = new PrismaClient();
export const customersRouter = Router();
const CUSTOMER_TYPES = new Set(['lead', 'customer']);
const LEAD_SOURCES = new Set(['website', 'instagram', 'tiktok', 'walkin', 'whatsapp', 'artist']);

function normalizeCustomerType(value) {
  return CUSTOMER_TYPES.has(value) ? value : 'customer';
}

function normalizeLeadSource(value) {
  return LEAD_SOURCES.has(value) ? value : null;
}

function buildCustomerPayload(body, currentType = 'customer') {
  const type = normalizeCustomerType(body.type ?? currentType);
  const leadSource = normalizeLeadSource(body.leadSource);
  const referredArtistId =
    leadSource === 'artist'
      ? (body.referredArtistId || null)
      : null;
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;

  if (type === 'lead' && !leadSource) {
    const err = new Error('Lead source is required');
    err.statusCode = 400;
    throw err;
  }
  if (type === 'lead' && !email && !phone) {
    const err = new Error('Lead must have at least email or phone');
    err.statusCode = 400;
    throw err;
  }
  if (leadSource === 'artist' && !referredArtistId) {
    const err = new Error('Artist name is required when lead source is artist');
    err.statusCode = 400;
    throw err;
  }

  return { type, leadSource, referredArtistId };
}

// GET /api/customers — list for dropdowns
customersRouter.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    const where = {};
    if (CUSTOMER_TYPES.has(type)) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    const customers = await prisma.customer.findMany({
      where,
      include: {
        referredArtist: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/customers — create (e.g. when creating a booking)
customersRouter.post('/', async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    const id = await generateNumericId(prisma, 'customer');
    const leadData = buildCustomerPayload(req.body);
    const customer = await prisma.customer.create({
      data: {
        id,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        ...leadData,
      },
      include: {
        referredArtist: {
          select: { id: true, name: true },
        },
      },
    });
    res.status(201).json(customer);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// PATCH /api/customers/:id — update customer or lead profile
customersRouter.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const data = {};
    if (req.body.name !== undefined) {
      const name = req.body.name?.trim();
      if (!name) return res.status(400).json({ error: 'Name is required' });
      data.name = name;
    }
    if (req.body.email !== undefined) data.email = req.body.email?.trim() || null;
    if (req.body.phone !== undefined) data.phone = req.body.phone?.trim() || null;
    if (req.body.type !== undefined || req.body.leadSource !== undefined || req.body.referredArtistId !== undefined) {
      const nextType = normalizeCustomerType(req.body.type ?? existing.type);
      if (nextType === 'lead' && existing._count.bookings > 0) {
        return res.status(400).json({ error: 'Booked customers cannot be changed back to leads' });
      }
      Object.assign(data, buildCustomerPayload(req.body, existing.type));
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data,
      include: {
        referredArtist: {
          select: { id: true, name: true },
        },
      },
    });
    res.json(customer);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// DELETE /api/customers/:id
customersRouter.delete('/:id', async (req, res) => {
  try {
    const existing = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { bookings: true } } },
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    if (existing._count.bookings > 0) {
      return res.status(400).json({ error: 'Cannot delete a customer that already has bookings' });
    }
    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
