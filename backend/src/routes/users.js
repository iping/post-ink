import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth.js';

const prisma = new PrismaClient();
export const usersRouter = Router();
usersRouter.use(requireAuth);

const defaultPasswordHash = async (plain) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

// GET /api/users — list all (no password)
usersRouter.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users — create
usersRouter.post('/', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password required (min 6 characters)' });
    }
    const emailNorm = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const passwordHash = await defaultPasswordHash(password);
    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        name: name?.trim() || null,
        role: role === 'admin' ? 'admin' : 'staff',
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id
usersRouter.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/users/:id
usersRouter.patch('/:id', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const data = {};
    if (email !== undefined) {
      const emailNorm = email.trim().toLowerCase();
      const existing = await prisma.user.findFirst({
        where: { email: emailNorm, NOT: { id: req.params.id } },
      });
      if (existing) return res.status(400).json({ error: 'Email already in use' });
      data.email = emailNorm;
    }
    if (name !== undefined) data.name = name?.trim() || null;
    if (role !== undefined) data.role = role === 'admin' ? 'admin' : 'staff';
    if (password !== undefined && String(password).length > 0) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      data.passwordHash = await defaultPasswordHash(password);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    res.json(user);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/users/:id
usersRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: e.message });
  }
});
