# JollofPlate API

Backend API for **JollofPlate** — menu, categories, restaurant settings, media uploads, and admin authentication.

> Public ordering checkout is WhatsApp-based on the frontend for MVP. This API does **not** process payments in v1.

## Scope (this repo)

| Area | Responsibility |
|------|----------------|
| Auth | Admin login, JWT access tokens |
| Catalog | Categories & meals CRUD + public read |
| Media | Image upload to Cloudinary |
| Settings | Restaurant profile, hours, WhatsApp number |
| Stats | Admin dashboard counters |

Frontend lives in [`jollofplate-web`](https://github.com/mjmandelah07/jollofplate-web).

## Stack

- NestJS
- TypeScript
- PostgreSQL (Supabase)
- Prisma ORM
- Cloudinary (images)
- JWT authentication
- Hosted on Render

## MVP goals

- Serve a fast public menu API for the website
- Let admins manage categories, meals, and settings securely
- Support image uploads (JPG, PNG, WEBP)
- Stay simple enough to add payments & orders in v2

## Suggested module structure

```
src/
  auth/
  categories/
  meals/
  uploads/
  settings/
  stats/
  prisma/
```

## Core data models (MVP)

### Category

- name, slug, image, description, status, sortOrder

### Meal

- name, slug, description
- price, discountPrice?
- categoryId
- images[]
- preparationTime
- featured, bestSeller, available

### RestaurantSettings (singleton)

- restaurantName
- whatsappNumber
- contactNumber
- email
- address
- businessHours
- deliveryFee
- socialLinks

### AdminUser

- email, passwordHash, firstName, lastName, role

### Customer

- email, passwordHash, firstName, lastName, phone?, role

### Order / OrderItem

- Pending → WhatsApp pay → admin marks Paid (or Cancelled)
- Items removable by customer or admin while pending

## Environment variables

```bash
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
PORT=3001
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=               # your Gmail address
SMTP_PASS=               # Google App Password (not normal password)
MAIL_FROM=JollofPlate <your-gmail@gmail.com>
```

## Getting started

```bash
cp .env.example .env
# Edit .env with your Supabase/Postgres + JWT + Cloudinary values

npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

API defaults to **http://localhost:3001**.

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run start:dev` | Nest watch mode |
| `npm run prisma:migrate` | Create/apply migrations |
| `npm run prisma:seed` | Seed admin + sample menu |
| `npm run build` | Production build |

## Keep-alive (Render free tier)

Render free services sleep after ~15 minutes idle. A **GitHub Action** pings every **5 minutes** (external wake-up).

1. Workflow: `.github/workflows/keep-alive.yml` (tries `/health`, then `/` per URL).
2. GitHub → **Settings → Secrets and variables → Actions → Variables**:
   - Name: `KEEP_ALIVE_URL`
   - Value: comma-separated Render URLs (API + web, prod + develop), e.g.  
     `https://jollofplate-api.onrender.com,https://jollofplate-web-develop.onrender.com`
3. Merge the workflow to **master** (scheduled jobs run from the default branch).
4. Run **Actions → Keep Alive → Run workflow** once to verify.

Health check: `curl https://your-api.onrender.com/health` → `{ "status": "ok" }`.

## Product requirements

See [`docs/PRD.md`](./docs/PRD.md) for endpoints, auth rules, and out-of-scope items.

## Related docs

- API PRD: [`docs/PRD.md`](./docs/PRD.md)
- Frontend API (bodies + responses): [`docs/FRONTEND_API.md`](./docs/FRONTEND_API.md)
- Frontend design flow (public + admin): [`docs/FRONTEND_DESIGN_FLOW.md`](./docs/FRONTEND_DESIGN_FLOW.md)
- Discounts, referrals & growth: [`docs/DISCOUNTS_REFERRALS.md`](./docs/DISCOUNTS_REFERRALS.md)
- Category image prompts: [`docs/CATEGORY_IMAGE_PROMPTS.md`](./docs/CATEGORY_IMAGE_PROMPTS.md)
- Logo prompts: [`docs/LOGO_PROMPTS.md`](./docs/LOGO_PROMPTS.md)
- Web repo: https://github.com/mjmandelah07/jollofplate-web
- Brand guide (web): https://github.com/mjmandelah07/jollofplate-web/blob/master/docs/BRAND.md
