# Deploying post.ink on Vercel

The app runs as **two Vercel projects** plus **Neon Postgres** (via the Vercel Marketplace):

| Component | Vercel project | URL (production) |
|-----------|----------------|------------------|
| Frontend (Vite React) | `frontend` | https://frontend-iping-s-projects.vercel.app |
| API (Express serverless) | `post-ink-api` | https://post-ink-api.vercel.app |
| Database | Neon (`neon-violet-flask`) | Linked env vars on `post-ink-api` |

## Prerequisites

- [Vercel CLI](https://vercel.com/docs/cli): `npx vercel@latest login`
- Accept Marketplace terms for **Neon** (one-time per team)

## 1. Database (Neon)

From `backend/`:

```bash
cd backend
npx vercel@latest link --project post-ink-api
npx vercel@latest integration add neon
```

This provisions Postgres and injects `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`, etc.

Schema is applied on each deploy via `prisma db push` in the build.

### Local development against Neon

```bash
cd backend
npx vercel@latest env pull .env.local
npm run dev
```

For local-only SQLite (legacy), use an older commit or set `DATABASE_URL=file:./dev.db` with `provider = "sqlite"` in `schema.prisma` (not used in production).

### Seed production (optional)

```bash
cd backend
npx vercel@latest env pull .env.local
npm run seed
```

## 2. API (`post-ink-api`)

```bash
cd backend
npx vercel@latest env add JWT_SECRET production --value "$(openssl rand -hex 32)" --yes
npx vercel@latest deploy --prod
```

Required env vars (Neon adds most automatically):

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PRISMA_URL` | Pooled Prisma connection (Neon) |
| `DATABASE_URL_UNPOOLED` | Direct URL for migrations / `db push` |
| `JWT_SECRET` | Auth tokens |

Optional:

| Variable | Purpose |
|----------|---------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for uploads (otherwise ephemeral disk in dev only) |
| `API_PUBLIC_URL` | Upload URL prefix (auto-set from `VERCEL_URL` on Vercel) |

Health check: `https://post-ink-api.vercel.app/api/health` → `{"ok":true}`

## 3. Frontend (`frontend`)

```bash
cd frontend
npx vercel@latest env add VITE_API_URL production --value "https://post-ink-api.vercel.app" --yes
npx vercel@latest deploy --prod
```

`VITE_API_URL` is baked in at build time — redeploy after changing it.

## 4. Verify

- Open the frontend URL — Discover and public pages load.
- Sign in — Network tab shows requests to `https://post-ink-api.vercel.app/api/...`
- Uploads work when **Vercel Blob** is linked to `post-ink-api` (recommended for production).

## Project layout

| Path | Purpose |
|------|---------|
| `frontend/vercel.json` | Vite build + SPA rewrites |
| `frontend/DOCUMENTATION.md` | Copy of docs bundled for Vercel builds |
| `backend/vercel.json` | Express → `/api` serverless + Prisma build |
| `backend/api/index.js` | Vercel entry (exports Express app) |
| `backend/src/app.js` | Express routes |
| `backend/prisma/schema.prisma` | PostgreSQL (Neon) in production |
