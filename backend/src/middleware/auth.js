import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'post-ink-dev-secret-change-in-production';

export const ROLES = { SUPER_ADMIN: 'super_admin', ADMIN: 'admin', STAFF: 'staff' };

/**
 * Verify Authorization: Bearer <token> and attach req.user.
 * Responds 401 if missing or invalid.
 */
export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { studio: true },
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Only super_admin can proceed. Use for platform-level actions (create studio, list all studios for admin panel). */
export function requireSuperAdmin(req, res, next) {
  if (req.user?.role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Super admin only' });
  }
  next();
}

/**
 * Effective studio scope for this request.
 * - super_admin: returns req.query.studioId (optional; when viewing one studio's data).
 * - studio user (admin/staff): returns req.user.studioId (their only studio).
 * Use this to filter all studio-scoped data (bookings, artists, customers, etc.).
 */
export function getStudioId(req) {
  if (req.user?.role === ROLES.SUPER_ADMIN) {
    return req.query.studioId || null;
  }
  return req.user?.studioId || null;
}

/** True if current user is super admin (can see all studios). */
export function isSuperAdmin(req) {
  return req.user?.role === ROLES.SUPER_ADMIN;
}

export { JWT_SECRET };
