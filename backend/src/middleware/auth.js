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
 * - super_admin: returns req.query.studioId or req.body.studioId (optional; when viewing/acting on one studio).
 * - studio user (admin/staff): returns req.user.studioId (their only studio).
 * Use this to filter all studio-scoped data (bookings, artists, customers, etc.).
 */
export function getStudioId(req) {
  if (req.user?.role === ROLES.SUPER_ADMIN) {
    return req.query.studioId || req.body?.studioId || null;
  }
  return req.user?.studioId || null;
}

/** True if current user is super admin (can see all studios). */
export function isSuperAdmin(req) {
  return req.user?.role === ROLES.SUPER_ADMIN;
}

/**
 * Use in studio-scoped routes: if no studioId, either respond with empty/404 for super_admin GET
 * or 400. Returns [studioId or null, true if response was already sent].
 */
export function getStudioIdOrSendError(req, res) {
  const studioId = getStudioId(req);
  if (studioId) return [studioId, false];
  if (isSuperAdmin(req) && req.method === 'GET') {
    if (req.params.id) res.status(404).json({ error: 'Not found' });
    else res.json([]);
    return [null, true];
  }
  res.status(400).json({ error: 'studioId required' });
  return [null, true];
}

export { JWT_SECRET };
