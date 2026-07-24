# JollofPlate API — Product Requirements (MVP+)

**Project:** JollofPlate Food Ordering Platform  
**Repo:** `jollofplate-api`  
**Version:** 1.1  
**Companion web:** [`jollofplate-web`](https://github.com/mjmandelah07/jollofplate-web)

## 1. Overview

Provide a secure NestJS API that powers the public menu experience, customer accounts/orders, and the admin dashboard. The API owns catalog data, restaurant settings, media uploads, admin authentication, customer authentication, and order persistence.

Checkout payment remains **WhatsApp-based** (no online payment gateway). Customers create an order in-app, then complete payment via WhatsApp. Admins manually mark orders as **paid**, or cancel them. Customers and admins may **remove items** from an order only while it is still **pending** (not yet paid).

## 2. Objectives

- Expose public read APIs for categories, meals, and restaurant settings
- Provide authenticated admin CRUD for catalog and settings
- Store and serve meal/category images via Cloudinary
- Return dashboard statistics for the admin overview
- Let customers register, log in, and keep orders in their account
- Support WhatsApp checkout with stored order refs (no Paystack in this version)
- Let admin mark orders paid / cancelled; allow item removal while pending

## 3. Roles & auth

| Role | Auth | Access |
|------|------|--------|
| Public | None | Read-only catalog & settings |
| Customer | JWT (Bearer), `role=customer` | Own profile orders: create, list, get, remove pending items |
| Administrator | JWT (Bearer), `role=admin` | Full admin mutations + all orders |

### Auth requirements

- **Admin:** email + password → `POST /auth/login`
- **Customer:** register + login → `POST /auth/register`, `POST /auth/customer/login`
- Password hashed (bcrypt)
- JWT issued on success; payload includes `sub`, `email`, `role`
- Protect `/admin/*` with JWT + **admin** role
- Protect customer order routes with JWT + **customer** role
- Seed at least one admin user for local/prod bootstrap

## 4. Functional requirements

### 4.1 Categories

Admins can create, update, delete, reorder, and toggle status.

**Fields**

| Field | Type | Notes |
|-------|------|-------|
| name | string | required |
| slug | string | auto-generated from name (not accepted in create/update body) |
| image | string? | Cloudinary URL |
| description | string? | |
| status | enum | active / inactive |
| sortOrder | number | auto-assigned on create; change via reorder endpoint |

**Public:** list active categories (sorted).  
**Admin:** full CRUD + reorder.

Admins do not send `slug` or `sortOrder` when creating/updating. Example create body:

```json
{
  "name": "Signature Jollof",
  "description": "classic party jollof, smoky jollof, coconut jollof",
  "image": "https://res.cloudinary.com/.../signature.png",
  "status": "ACTIVE"
}
```

Backend returns generated `slug` (e.g. `signature-jollof`) and next `sortOrder`. Reorder with `PATCH /admin/categories/reorder`.

### 4.2 Meals

Admins manage all meal fields. Public consumers only see **available** meals (unless admin).

**Fields**

| Field | Type | Notes |
|-------|------|-------|
| name | string | required |
| slug | string | auto-generated from name (not accepted in create/update body) |
| description | string | |
| price | int | whole **Naira** |
| discountPrice | int? | optional |
| categoryId | FK | required |
| images | string[] | JPG/PNG/WEBP via Cloudinary |
| preparationTime | int | minutes |
| featured | boolean | |
| bestSeller | boolean | |
| available | boolean | |
| ingredients | string? | for details page |
| extras | JSON? | optional add-ons with name + price |

**Public queries**

- List meals (filter by category, search by name)
- Featured meals
- Best sellers
- Single meal by slug

**Admin**

- Full CRUD
- Toggle available / featured / bestSeller
- Attach/remove images

### 4.3 Uploads / gallery

- Accept JPG, PNG, WEBP
- Upload to Cloudinary
- Return secure URL (+ publicId for deletes)
- Admin-only endpoint

### 4.4 Restaurant settings

Singleton resource for the restaurant.

**Fields**

- restaurantName
- whatsappNumber
- contactNumber
- email
- address
- businessHours (ordered week Mon→Sun: `day`, `label`, `open`, `close`, `closed`, optional `timezone`)
- deliveryFee
- socialLinks (JSON)

**Public:** GET settings (for footer, contact, WhatsApp number).  
**Admin:** GET + UPDATE.

Example `businessHours`:

```json
{
  "timezone": "Africa/Lagos",
  "week": [
    { "day": "monday", "label": "Monday", "open": "10:00", "close": "21:00", "closed": false },
    { "day": "tuesday", "label": "Tuesday", "open": "10:00", "close": "21:00", "closed": false },
    { "day": "wednesday", "label": "Wednesday", "open": "10:00", "close": "21:00", "closed": false },
    { "day": "thursday", "label": "Thursday", "open": "10:00", "close": "21:00", "closed": false },
    { "day": "friday", "label": "Friday", "open": "10:00", "close": "22:00", "closed": false },
    { "day": "saturday", "label": "Saturday", "open": "11:00", "close": "22:00", "closed": false },
    { "day": "sunday", "label": "Sunday", "open": "12:00", "close": "20:00", "closed": false }
  ]
}
```

Times use 24h `HH:mm`. Set `"closed": true` for days off (open/close optional then).

### 4.5 Dashboard stats

Admin-only aggregate endpoint returning:

- totalMeals
- totalCategories
- availableMeals
- unavailableMeals
- featuredMeals
- pendingOrders
- paidOrders

### 4.6 Customers

Customers create an account to save orders.

**Fields**

| Field | Type | Notes |
|-------|------|-------|
| email | string | unique |
| passwordHash | string | bcrypt |
| firstName | string | |
| lastName | string | |
| phone | string? | useful for WhatsApp / contact |

**Auth**

- Register, login
- JWT `role=customer`

### 4.7 Orders (WhatsApp payment)

Orders are stored so customers can track them and admins can confirm payment manually.

**Order status**

| Status | Meaning |
|--------|---------|
| `PENDING` | Created; awaiting WhatsApp payment confirmation |
| `PAID` | Admin marked as paid |
| `CANCELLED` | Cancelled by admin or emptied while pending |

**Order fields**

- orderNumber (unique, human-readable)
- customerId
- status
- subtotal, deliveryFee, total (whole Naira)
- notes?
- paidAt?
- items[]

**Order item fields**

- mealId (nullable if meal later deleted)
- name, unitPrice (snapshots at order time)
- quantity
- extras? (JSON)
- lineTotal

**Rules**

- Creating an order sets status `PENDING` and snapshots meal prices
- Frontend builds WhatsApp message using `orderNumber` + items + `settings.whatsappNumber`
- **Remove item** allowed for **customer (own order)** or **admin**, only when status is `PENDING`
- After item removal, recalculate totals; if no items remain, cancel/delete the pending order
- Admin can mark `PENDING` → `PAID` or `CANCELLED`
- No item edits after `PAID` or `CANCELLED`
- No Paystack / card verification in this version

## 5. Suggested API surface

Exact paths can follow NestJS conventions; keep REST + JSON.

### Public

```
GET  /categories
GET  /meals
GET  /meals/:slug
GET  /meals/featured
GET  /meals/best-sellers
GET  /settings
```

Query params for `GET /meals`: `category`, `search`, `page`, `limit`.

### Auth

```
POST /auth/login              # admin
POST /auth/register           # customer
POST /auth/customer/login     # customer
```

### Customer (JWT, role=customer)

```
GET|POST              /orders
GET                   /orders/:id
DELETE                /orders/:id/items/:itemId   # pending only
```

### Admin (JWT, role=admin)

```
GET|POST        /admin/categories
GET|PATCH|DELETE /admin/categories/:id

GET|POST        /admin/meals
GET|PATCH|DELETE /admin/meals/:id

POST            /admin/uploads
GET|PATCH       /admin/settings
GET             /admin/stats

GET             /admin/orders
GET             /admin/orders/:id
PATCH           /admin/orders/:id/status          # paid | cancelled
DELETE          /admin/orders/:id/items/:itemId   # pending only
```

## 6. Non-functional requirements

- Input validation on all writes (class-validator / Zod)
- Consistent error shape (`statusCode`, `message`, `error`)
- CORS limited to web origins
- Env-based secrets (never commit)
- Prisma migrations for all schema changes
- Indexed fields: `slug`, `categoryId`, `available`, `featured`, `bestSeller`, `orderNumber`, `order.status`, `customerId`
- Fast list endpoints suitable for mobile clients

## 7. Data rules

- Soft-delete optional; hard delete OK for MVP if unused
- Slugs must be unique and stable for SEO URLs on the web
- Unavailable meals must not appear on public list/detail (404 or omit)
- Prices: integer **whole Naira** everywhere (meals + orders)
- Currency for display is Naira (₦) on the web
- Order line prices are snapshotted; later meal price changes do not alter existing orders

## 8. Out of scope (later)

Do **not** implement unless explicitly requested:

- Paystack or any automated payment verification
- Delivery zones, maps, rider assignment
- Promo codes, loyalty, referrals
- Reviews & ratings
- Analytics beyond basic counts
- Multi-restaurant / multi-branch tenancy

## 9. Implementation checklist

- [x] Prisma schema: AdminUser, Category, Meal, RestaurantSettings
- [x] Auth module (admin login + JWT guard)
- [x] Categories module (public + admin)
- [x] Meals module (public filters + admin CRUD)
- [x] Cloudinary upload module
- [x] Settings module
- [x] Stats module
- [x] Seed script (admin + sample categories/meals)
- [x] CORS + env validation
- [x] Customer auth (register + login)
- [x] Orders module (create, list, remove pending items, admin mark paid)
- [ ] Deploy to Render with Supabase Postgres

## 10. Success criteria

- Public menu endpoints respond quickly enough for sub-30s browse UX
- Admin can create/update a meal (including image) reliably for sub-1-minute edits
- Customer can place an order, open WhatsApp with order details, and see it under their account
- Admin can mark an order paid or remove/cancel pending items without a payment gateway
- API stays available for frontend production traffic (target 99.9% with host SLAs)

## 11. Future schema hooks (do not build yet)

Leave room in design notes / naming for:

- `Payment` (gateway verification records)
- `Address`
- `PromoCode`, `Review`
- `DeliveryZone`
- Discount percent / scheduled deals, referral ledger — see [`DISCOUNTS_REFERRALS.md`](./DISCOUNTS_REFERRALS.md)
