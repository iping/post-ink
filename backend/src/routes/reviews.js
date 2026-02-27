import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const reviewsRouter = Router();

// GET /api/reviews — list all (optionally filter by artistId)
reviewsRouter.get('/', async (req, res) => {
  try {
    const where = {};
    if (req.query.artistId) where.artistId = req.query.artistId;
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true } },
        booking: { select: { id: true, date: true, startTime: true, endTime: true, notes: true } },
      },
    });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/reviews/artist/:artistId/summary — avg rating + count for an artist
reviewsRouter.get('/artist/:artistId/summary', async (req, res) => {
  try {
    const agg = await prisma.review.aggregate({
      where: { artistId: req.params.artistId },
      _avg: { rating: true },
      _count: { rating: true },
    });
    res.json({
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      totalReviews: agg._count.rating,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/reviews — create a review for a completed booking
reviewsRouter.post('/', async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;
    if (!bookingId || !rating) {
      return res.status(400).json({ error: 'bookingId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed bookings can be reviewed' });
    }
    if (booking.review) {
      return res.status(400).json({ error: 'This booking already has a review' });
    }

    const review = await prisma.review.create({
      data: {
        bookingId,
        artistId: booking.artistId,
        customerId: booking.customerId,
        rating: Number(rating),
        comment: comment || null,
      },
      include: {
        customer: { select: { id: true, name: true } },
        booking: { select: { id: true, date: true, notes: true } },
      },
    });
    res.status(201).json(review);
  } catch (e) {
    if (e.code === 'P2002') {
      return res.status(400).json({ error: 'This booking already has a review' });
    }
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/reviews/:id — update a review
reviewsRouter.patch('/:id', async (req, res) => {
  try {
    const data = {};
    if (req.body.rating !== undefined) {
      const r = Number(req.body.rating);
      if (r < 1 || r > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      data.rating = r;
    }
    if (req.body.comment !== undefined) data.comment = req.body.comment || null;

    const review = await prisma.review.update({
      where: { id: req.params.id },
      data,
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
    res.json(review);
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Review not found' });
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/reviews/:id
reviewsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ error: 'Review not found' });
    res.status(500).json({ error: e.message });
  }
});
