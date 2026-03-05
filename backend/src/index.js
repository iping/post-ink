import express from 'express';
import cors from 'cors';
import { artistsRouter } from './routes/artists.js';
import { availabilityRouter } from './routes/availability.js';
import { bookingsRouter } from './routes/bookings.js';
import { paymentsRouter } from './routes/payments.js';
import { customersRouter } from './routes/customers.js';
import { studiosRouter } from './routes/studios.js';
import { commissionsRouter } from './routes/commissions.js';
import { reviewsRouter } from './routes/reviews.js';
import { specialitiesRouter } from './routes/specialities.js';
import { uploadsRouter } from './routes/uploads.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/api/artists/:artistId/availability', availabilityRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/studios', studiosRouter);
app.use('/api/commissions', commissionsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/specialities', specialitiesRouter);
app.use('/api/uploads', uploadsRouter);

app.get('/api/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Post.Ink API running at http://localhost:${PORT}`);
});
