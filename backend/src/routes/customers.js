import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateNumericId } from '../utils/id.js';
import { getStudioId } from '../middleware/auth.js';

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

const customerInclude = {
  referredArtist: { select: { id: true, name: true } },
  studioCustomers: { include: { studio: { select: { id: true, name: true } } } },
};

// GET /api/customers — list customers linked to this studio (customer can be in one or more studios)
customersRouter.get('/', async (req, res) => {
  try {
    const studioId = getStudioId(req);
    if (!studioId) return res.status(400).json({ error: 'studioId required' });
    const { type, search } = req.query;
    const where = { studioCustomers: { some: { studioId } } };
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
      include: customerInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/customers — create and link to current studio
customersRouter.post('/', async (req, res) => {
  try {
    const studioId = getStudioId(req);
    if (!studioId) return res.status(400).json({ error: 'studioId required' });
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
        studioCustomers: { create: { studioId } },
      },
      include: customerInclude,
    });
    res.status(201).json(customer);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// PATCH /api/customers/:id — update customer or lead profile (must be linked to this studio)
customersRouter.patch('/:id', async (req, res) => {
  try {
    const studioId = getStudioId(req);
    if (!studioId) return res.status(400).json({ error: 'studioId required' });
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, studioCustomers: { some: { studioId } } },
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
      include: customerInclude,
    });
    res.json(customer);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});

// DELETE /api/customers/:id — delete customer (must be linked to this studio; no bookings allowed)
customersRouter.delete('/:id', async (req, res) => {
  try {
    const studioId = getStudioId(req);
    if (!studioId) return res.status(400).json({ error: 'studioId required' });
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, studioCustomers: { some: { studioId } } },
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

// POST /api/customers/:id/studios — link this customer to the current studio (add to one more studio)
customersRouter.post('/:id/studios', async (req, res) => {
  try {
    const studioId = getStudioId(req);
    if (!studioId) return res.status(400).json({ error: 'studioId required' });
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: customerInclude,
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const already = await prisma.studioCustomer.findUnique({
      where: { studioId_customerId: { studioId, customerId: req.params.id } },
    });
    if (already) return res.status(200).json(customer);
    await prisma.studioCustomer.create({
      data: { studioId, customerId: req.params.id },
    });
    const updated = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: customerInclude,
    });
    res.status(201).json(updated);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
});
