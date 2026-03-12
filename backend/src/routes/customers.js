import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateNumericId } from '../utils/id.js';

const prisma = new PrismaClient();
export const customersRouter = Router();

// GET /api/customers — list for dropdowns
customersRouter.get('/', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
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
    const id = await generateNumericId(prisma, 'customer');
    const customer = await prisma.customer.create({
      data: { id, name, email: email || null, phone: phone || null },
    });
    res.status(201).json(customer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
