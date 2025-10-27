# Changelog

All notable changes for the LMS hackathon project.

## 2025-10-27

- Scaffolded project structure: `server/` (Express API) and `client/` (vanilla HTML/CSS/JS).
- Backend
  - Added models: `User`, `Book`.
  - Added auth middleware: JWT `requireAuth`, `requireAdmin`.
  - Routes:
    - `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
    - `GET /api/books`, `POST /api/books`, `PUT /api/books/:id`, `DELETE /api/books/:id`.
    - `POST /api/admin/issue`, `POST /api/admin/return`.
    - `GET /api/member/my-books`.
  - Added startup admin seeding from env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`.
  - Added `.env.example` and `package.json` with nodemon.
- Frontend
  - Pages: `login.html`, `index.html` (member), `admin.html`.
  - `app.js` wired to backend with fetch, token storage, role redirect, and basic search UI.
  - Basic styling in `style.css`.
- Docs
  - Added `README.md` with setup, endpoints, and flows.

## 2025-10-27 (Later)

- UI
  - Centered and redesigned `login.html` using an auth card layout.
  - Upgraded overall styling, added badges, buttons, responsive cards, and images on book cards.
- Backend
  - Extended `Book` model with `description` and `coverImage`.
  - Added routes:
    - `GET /api/books/:isbn` (book details)
    - `POST /api/member/borrow` (member borrows by ISBN)
    - `POST /api/member/return` (member returns by ISBN)
    - `POST /api/admin/seed-books` (admin demo seeding with images and categories)
  - Served static frontend from Express and added SPA fallback for non-API routes.
  - Added no-cache headers and `Clear-Site-Data` to avoid stale PWA cache from prior apps.
- Frontend
  - `index.html` now shows cover images, description snippet, status badges, and buttons for Details / Borrow / Return.
  - `admin.html` includes “Seed Demo Books” button.
  - `app.js` cleans any existing service workers/caches on load; stores role at login; wires new actions.
- Tests
  - Seeded 10 demo books; verified member borrow/return flows end-to-end via API.

## Planned (next)
- QR/Barcode scanning for admin issue flow.
- Simple recommender on member dashboard.
- Email notifications with `node-cron` + `nodemailer`.
