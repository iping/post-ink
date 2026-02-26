# Post.Ink

App for **tattoo artists**, **tattoo studios**, and **customers**.

## Entities

- **Tattoo Artist** — profile (photos, name, description, experience, speciality, portfolio) and **availability** (date/time slots).
- **Tattoo Studio** — manage artists, payments, bookings (models in place; UI later).
- **Customer** — book tattoos, laser removal, or cover-ups (models in place; UI later).

## Stack

- **Backend**: Node.js, Express, Prisma (SQLite)
- **Frontend**: React, Vite, React Router

## Setup

### Prerequisites

- Node.js 18+

### Backend

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

API: `http://localhost:3001`

### Seed example content

From project root (after migrations):

```bash
npm run db:seed
```

Or from backend: `cd backend && npm run seed`. This adds 3 example tattoo artists (Maya Chen, Jake Rivera, Luna Park) with placeholder photos/portfolio and 7 days of availability each.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` and `/uploads` to backend)

### Run both and open in browser

From project root (first time: run backend setup above, then):

```bash
npm install
npm run dev:open
```

This starts backend and frontend, then opens **http://localhost:5173** in your browser when the app is ready.

Or run without opening the browser:

```bash
npm run dev
```

Then open **http://localhost:5173** in your browser. On macOS you can run `npm run open` to open that URL (on Windows use `start http://localhost:5173`).

## API (Artists & Availability)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/artists` | List artists |
| GET | `/api/artists/:id` | Get one artist |
| POST | `/api/artists` | Create artist (multipart: name, shortDescription, experiences, speciality, photos[], portfolio[]) |
| PATCH | `/api/artists/:id` | Update artist |
| DELETE | `/api/artists/:id` | Delete artist |
| GET | `/api/artists/:id/availability` | List availability (query: `from`, `to` YYYY-MM-DD) |
| POST | `/api/artists/:id/availability` | Add slot(s) (body: `{ date, startTime, endTime, isAvailable }` or `{ slots: [...] }`) |
| PATCH | `/api/artists/:id/availability/:slotId` | Update slot |
| DELETE | `/api/artists/:id/availability/:slotId` | Delete slot |

## Implemented

- **Tattoo Artist CRUD**: profile (photos, name, short description, experience, speciality, portfolio).
- **Artist availability**: artists can add/edit/remove date+time slots and mark available/unavailable.
- **Studio / Booking / Payment**: Prisma models only; manage booking & payment from studio UI (to be built).

## Next (Studio features)

- Studio dashboard: manage artist availability (view/edit).
- Booking process: create/list bookings, link to artists and customers.
- Payment process: record payments against bookings, status (pending/completed/refunded).
