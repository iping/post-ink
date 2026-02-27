import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const artists = await prisma.tattooArtist.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        availability: true,
        reviews: {
          select: { rating: true },
        },
      },
    });
    res.json(artists);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/artists/:id — one artist
artistsRouter.get('/:id', async (req, res) => {
  try {
    const artist = await prisma.tattooArtist.findUnique({
      where: { id: req.params.id },
      include: {
        availability: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            customer: { select: { id: true, name: true } },
            booking: { select: { date: true, notes: true } },
          },
        },
      },
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
    const data = {
      name: req.body.name,
      shortDescription: req.body.shortDescription || null,
      experiences: req.body.experiences || null,
      speciality: req.body.speciality || null,
      rate: req.body.rate != null && req.body.rate !== '' ? Number(req.body.rate) : null,
      photos: JSON.stringify([...existingPhotos, ...photos]),
      portfolio: JSON.stringify([...existingPortfolio, ...portfolio]),
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
    const existing = await prisma.tattooArtist.findUnique({ where: { id: req.params.id } });
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
    await prisma.tattooArtist.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Artist not found' });
    res.status(500).json({ error: e.message });
  }
});
