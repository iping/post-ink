# Changelog

Product and technical updates for **Post.Ink / InkedHub**.  
Edit this file at the repository root. The in-app **Docs** page (`/docs`) now uses **`DOCUMENTATION.md`** (user types + database structure); this file is optional release history only.

Use this shape for each entry:

```markdown
## YYYY-MM-DD — Short title

### Summary
One line.

### User-visible
- …

### Technical
- …

### Deploy / migrate
- … (or “None”)
```

---

## 2026-04-09 — Documentation site & changelog

### Summary
Added an in-app documentation page that renders this changelog.

### User-visible
- New **Docs** link in the main header → `/docs` (no login required for now).

### Technical
- `CHANGELOG.md` at repo root; bundled via Vite alias `@changelog` in `frontend/vite.config.js`.
- New page: `frontend/src/pages/Docs.jsx`.

### Deploy / migrate
- None.

---

## 2026-04-01 — Management UX & navigation

### Summary
Sidebar booking entry simplified; superadmin studio list and subscription tooling refined.

### User-visible
- Removed **New Booking** from the sidebar; create bookings from **Booking Orders** instead.
- Superadmin **Studios** menu entry (platform studio list).
- Subscription: prorated artist-slot cap (per-slot max aligned to monthly fee), grace period display, pay-subscription action, “where to pay” from studio payment destinations.

### Technical
- Backend: `POST /api/studios/:id/pay-subscription`, artist slot proration in `backend/src/utils/artist-slots.js`.
- Frontend: `Studio.jsx`, `ManageLayout.jsx`, `api.js`; seed fixes for studio counts.

### Deploy / migrate
- Run Prisma migrations if not already applied: artist slot purchases, studio billing history.

---

## Earlier releases

See git history on `main` for commits before this changelog was introduced.
