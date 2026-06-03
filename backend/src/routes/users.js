import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ROLES, isSuperAdmin } from '../middleware/auth.js';

export const usersRouter = Router();

const defaultPasswordHash = async (plain) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

// GET /api/users — list: super_admin sees all; studio user sees only same-studio users
usersRouter.get('/', async (req, res) => {
  try {
    const where = isSuperAdmin(req) ? {} : { studioId: req.user.studioId };
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, studioId: true, createdAt: true, updatedAt: true },
    });
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/users — create (super_admin can set studioId; studio user gets their studioId)
usersRouter.post('/', async (req, res) => {
  try {
    const { email, password, name, role, studioId: bodyStudioId } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'Email required' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ error: 'Password required (min 6 characters)' });
    }
    const studioId = isSuperAdmin(req) ? (bodyStudioId || null) : req.user.studioId;
    if (!isSuperAdmin(req) && !req.user.studioId) {
      return res.status(403).json({ error: 'Studio user cannot create users without a studio' });
    }
    const emailNorm = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    const roleVal = role === ROLES.SUPER_ADMIN && isSuperAdmin(req) ? ROLES.SUPER_ADMIN : (role === 'admin' ? 'admin' : 'staff');
    const passwordHash = await defaultPasswordHash(password);
    const user = await prisma.user.create({
      data: {
        email: emailNorm,
        passwordHash,
        name: name?.trim() || null,
        role: roleVal,
        studioId: roleVal === ROLES.SUPER_ADMIN ? null : studioId,
      },
      select: { id: true, email: true, name: true, role: true, studioId: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/users/:id
usersRouter.get('/:id', async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (!isSuperAdmin(req)) where.studioId = req.user.studioId;
    const user = await prisma.user.findFirst({
      where,
      select: { id: true, email: true, name: true, role: true, studioId: true, createdAt: true, updatedAt: true },
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
    const where = { id: req.params.id };
    if (!isSuperAdmin(req)) where.studioId = req.user.studioId;
    const existingUser = await prisma.user.findFirst({ where });
    if (!existingUser) return res.status(404).json({ error: 'User not found' });
    const { email, password, name, role, studioId: bodyStudioId } = req.body;
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
    if (role !== undefined) {
      data.role = (role === ROLES.SUPER_ADMIN && isSuperAdmin(req)) ? ROLES.SUPER_ADMIN : (role === 'admin' ? 'admin' : 'staff');
      if (data.role === ROLES.SUPER_ADMIN) data.studioId = null;
      else if (isSuperAdmin(req) && bodyStudioId !== undefined) data.studioId = bodyStudioId || null;
      else if (!isSuperAdmin(req)) data.studioId = req.user.studioId;
    }
    if (password !== undefined && String(password).length > 0) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      data.passwordHash = await defaultPasswordHash(password);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, name: true, role: true, studioId: true, createdAt: true, updatedAt: true },
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
    const where = { id: req.params.id };
    if (!isSuperAdmin(req)) where.studioId = req.user.studioId;
    const existing = await prisma.user.findFirst({ where });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: e.message });
  }
});
