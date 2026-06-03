import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import { artistsRouter } from './routes/artists.js';
import { availabilityRouter } from './routes/availability.js';
import { bookingsRouter } from './routes/bookings.js';
import { paymentsRouter } from './routes/payments.js';
import { customersRouter } from './routes/customers.js';
import { studiosRouter } from './routes/studios.js';
import { commissionsRouter } from './routes/commissions.js';
import { specialitiesRouter } from './routes/specialities.js';
import { uploadsRouter } from './routes/uploads.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { projectsRouter } from './routes/projects.js';
import { sessionsRouter } from './routes/sessions.js';
import { paymentDestinationsRouter } from './routes/payment-destinations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

if (process.env.VERCEL_URL && !process.env.API_PUBLIC_URL) {
  process.env.API_PUBLIC_URL = `https://${process.env.VERCEL_URL}`;
}

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);

function requireAuthUnless(req, res, next) {
  if (req.path === '/health' || req.path.startsWith('/auth')) return next();
  return requireAuth(req, res, next);
}

app.use('/api', requireAuthUnless);
app.use('/api/users', usersRouter);
app.use('/api/artists/:artistId/availability', availabilityRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/studios', studiosRouter);
app.use('/api/commissions', commissionsRouter);
app.use('/api/specialities', specialitiesRouter);
app.use('/api/payment-destinations', paymentDestinationsRouter);
app.use('/api/uploads', uploadsRouter);

export default app;
