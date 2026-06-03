import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/login — email + password, returns { token, user }
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    let user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    // Safety net: if a non–super-admin user has no studio assigned, attach them
    // to the first available studio so studio-scoped data loads instead of 400s.
    if (user.role !== 'super_admin' && !user.studioId) {
      const firstStudio = await prisma.tattooStudio.findFirst();
      if (firstStudio) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { studioId: firstStudio.id },
        });
      }
    }
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    const userWithStudio = await prisma.user.findUnique({
      where: { id: user.id },
      include: { studio: true },
    });
    res.json({
      token,
      user: {
        id: userWithStudio.id,
        email: userWithStudio.email,
        name: userWithStudio.name,
        role: userWithStudio.role,
        studioId: userWithStudio.studioId,
        studio: userWithStudio.studio ? { id: userWithStudio.studio.id, name: userWithStudio.studio.name } : null,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/auth/me — return current user (requires Authorization header)
authRouter.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { studio: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studioId: user.studioId,
      studio: user.studio ? { id: user.studio.id, name: user.studio.name } : null,
    });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});
