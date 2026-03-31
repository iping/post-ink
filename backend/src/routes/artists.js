import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStudioIdOrSendError } from '../middleware/auth.js';
import { assertCanAddArtist } from '../utils/artist-slots.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
});
const upload = multer({ storage });

function parseJsonField(val) {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val ? [val] : [];
    }
  }
  return Array.isArray(val) ? val : [];
}

// GET /api/artists — list all
export const artistsRouter = Router();

artistsRouter.get('/', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const activeOnly = req.query.activeOnly === 'true';
    const where = { studioId };
    if (activeOnly) where.isActive = true;
    const artists = await prisma.tattooArtist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { availability: true },
    });
    res.json(artists);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/artists/:id — one artist (must belong to user's studio)
artistsRouter.get('/:id', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const artist = await prisma.tattooArtist.findFirst({
      where: { id: req.params.id, studioId },
      include: { availability: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] } },
    });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/artists — create (with optional photos/portfolio files)
artistsRouter.post('/', upload.fields([{ name: 'photos', maxCount: 10 }, { name: 'portfolio', maxCount: 20 }]), async (req, res) => {
  try {
    const photos = (req.files?.photos || []).map(f => `/uploads/${f.filename}`);
    const portfolio = (req.files?.portfolio || []).map(f => `/uploads/${f.filename}`);
    const existingPhotos = parseJsonField(req.body.photos);
    const existingPortfolio = parseJsonField(req.body.portfolio);
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const gate = await assertCanAddArtist(prisma, studioId);
    if (!gate.ok) {
      return res.status(gate.statusCode).json({
        error: gate.error,
        code: gate.code,
        hint: gate.hint,
        pendingPurchaseId: gate.pendingPurchaseId,
      });
    }
    const data = {
      studioId,
      name: req.body.name,
      shortDescription: req.body.shortDescription || null,
      experiences: req.body.experiences || null,
      speciality: req.body.speciality || null,
      rate: req.body.rate != null && req.body.rate !== '' ? Number(req.body.rate) : null,
      photos: JSON.stringify([...existingPhotos, ...photos]),
      portfolio: JSON.stringify([...existingPortfolio, ...portfolio]),
      isActive: req.body.isActive !== 'false' && req.body.isActive !== false,
    };
    const artist = await prisma.tattooArtist.create({ data });
    res.status(201).json(artist);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/artists/:id — update
artistsRouter.patch('/:id', upload.fields([{ name: 'photos', maxCount: 10 }, { name: 'portfolio', maxCount: 20 }]), async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.tattooArtist.findFirst({ where: { id: req.params.id, studioId } });
    if (!existing) return res.status(404).json({ error: 'Artist not found' });
    const photos = (req.files?.photos || []).map(f => `/uploads/${f.filename}`);
    const portfolio = (req.files?.portfolio || []).map(f => `/uploads/${f.filename}`);
    const existingPhotos = req.body.photos != null ? parseJsonField(req.body.photos) : JSON.parse(existing.photos);
    const existingPortfolio = req.body.portfolio != null ? parseJsonField(req.body.portfolio) : JSON.parse(existing.portfolio);
    const data = {
      ...(req.body.name != null && { name: req.body.name }),
      ...(req.body.shortDescription !== undefined && { shortDescription: req.body.shortDescription || null }),
      ...(req.body.experiences !== undefined && { experiences: req.body.experiences || null }),
      ...(req.body.speciality !== undefined && { speciality: req.body.speciality || null }),
      ...(req.body.rate !== undefined && { rate: req.body.rate != null && req.body.rate !== '' ? Number(req.body.rate) : null }),
      ...(req.body.isActive !== undefined && { isActive: req.body.isActive === 'true' || req.body.isActive === true }),
      photos: JSON.stringify([...existingPhotos, ...photos]),
      portfolio: JSON.stringify([...existingPortfolio, ...portfolio]),
    };
    const artist = await prisma.tattooArtist.update({ where: { id: req.params.id }, data });
    res.json(artist);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/artists/:id
artistsRouter.delete('/:id', async (req, res) => {
  try {
    const [studioId, sent] = getStudioIdOrSendError(req, res);
    if (sent) return;
    const existing = await prisma.tattooArtist.findFirst({ where: { id: req.params.id, studioId } });
    if (!existing) return res.status(404).json({ error: 'Artist not found' });
    await prisma.tattooArtist.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Artist not found' });
    res.status(500).json({ error: e.message });
  }
});
