# JollofPlate API — Frontend Reference

Everything the frontend needs: every endpoint, its request body, and its exact response shape.

## Basics

| | |
|---|---|
| Base URL (local) | `http://localhost:3001` |
| Base URL (prod) | your Render URL, e.g. `https://jollofplate-api.onrender.com` |
| Auth header | `Authorization: Bearer <accessToken>` |
| Content type | `application/json` (except uploads: `multipart/form-data`) |
| Prices | whole Naira integers (`3500` = ₦3,500) — no kobo, no decimals |

There is **no URL prefix** — routes are at the root (`/auth/login`, not `/api/auth/login`).

### Roles

- **Public** — no token needed.
- **Customer** — token from `/auth/register` or `/auth/customer/login`.
- **Admin** — token from `/auth/login`.

Tokens carry the role; a customer token on an admin route returns `403`.

### Cart is frontend-only

There is no cart on the backend. Keep the cart in client state (Zustand/context/localStorage). At checkout, send the whole cart to `POST /orders` — that creates the order.

### Error format (all endpoints)

```json
{
  "statusCode": 400,
  "message": ["price must not be less than 0"],
  "error": "Bad Request"
}
```

`message` is a string or an array of strings (validation errors). Common codes: `400` validation, `401` bad/missing token, `403` wrong role, `404` not found, `409` conflict (duplicate email/slug).

Unknown body fields are **rejected** (`forbidNonWhitelisted`) — send only documented fields.

---

## 1. Auth

### POST `/auth/register` — customer sign-up (Public)

Body:

```json
{
  "email": "ada@example.com",
  "password": "secret123",
  "firstName": "Ada",
  "lastName": "Obi",
  "phone": "08012345678"
}
```

`phone` is optional. `password` min 6 chars.

Response `201`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "customer": {
    "id": "cmd...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Obi",
    "phone": "08012345678",
    "role": "customer",
    "emailVerified": false
  },
  "message": "Registered. Check your email to verify your account."
}
```

Errors: `409` "Email already registered".

### POST `/auth/customer/login` — customer login (Public)

Body:

```json
{ "email": "ada@example.com", "password": "secret123" }
```

Response `201`: same shape as register (`accessToken` + `customer` with `emailVerified`).

Errors: `401` "Invalid email or password".

### POST `/auth/verify-email` — confirm email (Public)

Called when the user lands on `/verify-email?token=...` from the email link.

Body:

```json
{ "token": "a1b2c3..." }
```

Response `201`:

```json
{
  "message": "Email verified successfully",
  "customer": {
    "id": "cmd...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Obi",
    "phone": "08012345678",
    "role": "customer",
    "emailVerified": true
  }
}
```

Errors: `400` invalid/expired token.

### POST `/auth/resend-verification` — resend email (Customer)

Requires customer JWT. Body: none.

Response `201`: `{ "message": "Verification email sent", "customer": { ..., "emailVerified": false } }`

If already verified: `{ "message": "Email already verified", "customer": { ..., "emailVerified": true } }`

**Frontend flow**

1. After register, show “Check your email” banner (`emailVerified: false`).
2. Page `/verify-email?token=` → `POST /auth/verify-email` with that token → then login or refresh profile.
3. “Resend” button → `POST /auth/resend-verification`.
4. Link format: `{FRONTEND_URL}/verify-email?token={token}` (API builds this).

Login/register still work before verification (soft verify). Use `customer.emailVerified` to show a banner; optionally gate checkout later.

### POST `/auth/login` — admin login (Public)

Body:

```json
{ "email": "admin@jollofplate.com", "password": "..." }
```

Response `201`:

```json
{
  "accessToken": "eyJhbGciOi...",
  "admin": {
    "id": "cmd...",
    "email": "admin@jollofplate.com",
    "firstName": "Mojisola",
    "lastName": "Aramide",
    "role": "admin"
  }
}
```

---

## 2. Public catalog

### GET `/categories` (Public)

Active categories, sorted by `sortOrder`. Paginated.

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `search` | string | matches `name`, `slug`, or `description` (case-insensitive) |
| `page` | int | default `1` |
| `limit` | int | default `20`, max `100` |

Response `200`:

```json
{
  "items": [
    {
      "id": "cmd...",
      "name": "Signature Jollof",
      "slug": "signature-jollof",
      "image": "https://res.cloudinary.com/.../jollof.webp",
      "description": "Classic party jollof and friends",
      "status": "ACTIVE",
      "sortOrder": 0,
      "createdAt": "2026-07-20T10:00:00.000Z",
      "updatedAt": "2026-07-20T10:00:00.000Z"
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### GET `/meals` (Public)

Available meals, paginated.

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `category` | string | category **slug or id** — e.g. `?category=signature-jollof` |
| `search` | string | case-insensitive name match |
| `page` | int | default `1` |
| `limit` | int | default `20`, max `100` |

Response `200`:

```json
{
  "items": [
    {
      "id": "cmd...",
      "name": "Smoky Party Jollof",
      "slug": "smoky-party-jollof",
      "description": "Firewood-style smoky jollof rice",
      "price": 3500,
      "discountPrice": 3000,
      "categoryId": "cmd...",
      "images": ["https://res.cloudinary.com/.../smoky.webp"],
      "preparationTime": 25,
      "featured": true,
      "bestSeller": false,
      "available": true,
      "ingredients": "Rice, tomatoes, peppers, spices",
      "extras": [
        { "name": "Extra protein", "price": 1500 },
        { "name": "Plantain", "price": 500 }
      ],
      "createdAt": "2026-07-20T10:00:00.000Z",
      "updatedAt": "2026-07-20T10:00:00.000Z",
      "category": { "id": "cmd...", "name": "Signature Jollof", "slug": "signature-jollof" }
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Display price: use `discountPrice` when it's not `null`, otherwise `price`. `extras` may be `null`.

### GET `/meals/featured` (Public)

Response `200`: **array** of meal objects (same shape as above, includes `category`). No pagination.

### GET `/meals/best-sellers` (Public)

Response `200`: array of meal objects. No pagination.

### GET `/meals/:slug` (Public)

Single meal by slug (only if `available`).

Response `200`: one meal object (with `category`). Errors: `404` "Meal not found".

### GET `/meals/:slug/related` (Public) — You may also like

Up to **4** related available meals for the meal detail page.

**Logic:**
1. Same category first (featured → best seller → recently updated)
2. If fewer than 4, fill with other featured / best-sellers

Response `200`: array of meal objects (same shape as list items, with `category`). Empty array if nothing else is available. `404` if the slug itself is not found.

```json
[
  {
    "id": "cmd...",
    "name": "Coconut Jollof",
    "slug": "coconut-jollof",
    "price": 3500,
    "discountPrice": null,
    "featured": false,
    "bestSeller": true,
    "category": { "id": "cmd...", "name": "Signature Jollof", "slug": "signature-jollof" }
  }
]
```

### GET `/settings` (Public)

Restaurant profile — use for footer, contact page, WhatsApp button, delivery fee display.

Response `200`:

```json
{
  "id": "cmd...",
  "restaurantName": "JollofPlate",
  "whatsappNumber": "2348000000000",
  "contactNumber": "08012345678",
  "email": "hello@jollofplate.com",
  "address": "12 Allen Avenue, Ikeja, Lagos",
  "businessHours": {
    "timezone": "Africa/Lagos",
    "week": [
      { "day": "monday", "label": "Mon", "open": "09:00", "close": "21:00", "closed": false },
      { "day": "sunday", "label": "Sun", "closed": true }
    ]
  },
  "deliveryFee": 1000,
  "socialLinks": { "instagram": "https://instagram.com/jollofplate" },
  "createdAt": "2026-07-20T10:00:00.000Z",
  "updatedAt": "2026-07-20T10:00:00.000Z"
}
```

`contactNumber`, `email`, `address`, `businessHours`, `socialLinks` can be `null`.

---

## 3. Orders (Customer token required)

### POST `/orders` — checkout (Customer)

Send the local cart. The server re-prices everything from the DB (client prices are ignored), adds the current `deliveryFee` from settings, and creates a `PENDING` order.

Body:

```json
{
  "items": [
    {
      "mealId": "cmd...",
      "quantity": 2,
      "extras": [{ "name": "Extra protein", "price": 1500 }]
    },
    { "mealId": "cmd...", "quantity": 1 }
  ],
  "deliveryAddress": {
    "line1": "12 Allen Avenue",
    "line2": "Flat 3B",
    "city": "Ikeja",
    "state": "Lagos",
    "landmark": "Near Computer Village gate",
    "phone": "08012345678"
  },
  "notes": "No pepper please"
}
```

| Field | Required | Notes |
|---|---|---|
| `items` | yes | min 1; `quantity` min 1; `extras` optional |
| `deliveryAddress.line1` | yes | street / house / estate (min 3 chars) |
| `deliveryAddress.city` | yes | |
| `deliveryAddress.line2` | no | apartment / floor |
| `deliveryAddress.state` | no | e.g. Lagos |
| `deliveryAddress.landmark` | no | helps the rider |
| `deliveryAddress.phone` | no | delivery contact; else use customer phone in UI |
| `notes` | no | kitchen / order notes |

- Each extra's `price` is added per unit: `lineTotal = (unitPrice + extrasTotal) × quantity`.
- `unitPrice` = meal's `discountPrice` if set, else `price`.

Response `201`:

```json
{
  "id": "cmd...",
  "orderNumber": "JP-483920",
  "customerId": "cmd...",
  "status": "PENDING",
  "subtotal": 9500,
  "deliveryFee": 1000,
  "total": 10500,
  "deliveryLine1": "12 Allen Avenue",
  "deliveryLine2": "Flat 3B",
  "deliveryCity": "Ikeja",
  "deliveryState": "Lagos",
  "deliveryLandmark": "Near Computer Village gate",
  "deliveryPhone": "08012345678",
  "notes": "No pepper please",
  "paidAt": null,
  "createdAt": "2026-07-24T21:00:00.000Z",
  "updatedAt": "2026-07-24T21:00:00.000Z",
  "items": [
    {
      "id": "cmd...",
      "orderId": "cmd...",
      "mealId": "cmd...",
      "name": "Smoky Party Jollof",
      "unitPrice": 3000,
      "quantity": 2,
      "extras": [{ "name": "Extra protein", "price": 1500 }],
      "lineTotal": 9000,
      "createdAt": "2026-07-24T21:00:00.000Z",
      "updatedAt": "2026-07-24T21:00:00.000Z"
    }
  ],
  "checkout": {
    "whatsappNumber": "2348000000000",
    "suggestedMessage": "Hello JollofPlate! I want to pay for order JP-483920 (Total: ₦10500).\nDeliver to: 12 Allen Avenue, Flat 3B, Ikeja, Lagos, Landmark: Near Computer Village gate, Phone: 08012345678"
  }
}
```

**WhatsApp handoff:** after creating the order, open

```
https://wa.me/{checkout.whatsappNumber}?text={encodeURIComponent(message)}
```

Build `message` from `items` + totals + **delivery address** (see [`FRONTEND_DESIGN_FLOW.md`](./FRONTEND_DESIGN_FLOW.md) §2.3). The API’s `checkout.suggestedMessage` is a short fallback (order number + total + address).

Errors: `400` "Meal not available: <id>" (meal deleted/unavailable — remove it from the cart and retry).

### GET `/orders` — my orders (Customer)

Query params (all optional):

| Param | Type | Notes |
|---|---|---|
| `search` | string | matches `orderNumber` or `notes` |
| `status` | string | `PENDING` \| `PAID` \| `CANCELLED` |
| `page` | int | default `1` |
| `limit` | int | default `20`, max `100` |

Response `200`:

```json
{
  "items": [ /* order objects with items, no checkout field */ ],
  "meta": { "total": 5, "page": 1, "limit": 20, "totalPages": 1 }
}
```

### GET `/orders/:id` — one of my orders (Customer)

Response `200`: one order object with `items`. `404` if the order doesn't exist or belongs to another customer.

### DELETE `/orders/:id/items/:itemId` — remove item (Customer)

Only while the order is `PENDING`. Server recalculates `subtotal`/`total`.

Response `200` (items remain): updated order object with `items`.

Response `200` (it was the last item — whole order is deleted):

```json
{ "deleted": true, "message": "Last item removed; pending order deleted" }
```

Check for `deleted: true` to know the order is gone.

Errors: `400` "Items can only be removed from pending orders", `403` "Not your order", `404` order/item not found.

---

## 3b. Saved Addresses (Customer token required)

Let signed-in customers save delivery addresses and reuse them at checkout. Copy a saved address into `POST /orders`'s `deliveryAddress` on the frontend (orders still store their own address snapshot).

Address object:

```json
{
  "id": "cmd...",
  "customerId": "cmd...",
  "label": "Home",
  "line1": "12 Allen Avenue",
  "line2": "Flat 3B",
  "city": "Ikeja",
  "state": "Lagos",
  "landmark": "Near Computer Village gate",
  "phone": "08012345678",
  "isDefault": true,
  "createdAt": "2026-07-25T09:00:00.000Z",
  "updatedAt": "2026-07-25T09:00:00.000Z"
}
```

| Method & path | Body / query | Response |
|---|---|---|
| GET `/addresses` | `?search=&page=1&limit=20` | `{ items, meta }` — default first, then newest |
| GET `/addresses/:id` | — | one address |
| POST `/addresses` | see below | `201` created address |
| PATCH `/addresses/:id` | any subset of create body | updated address |
| PATCH `/addresses/:id/default` | — | that address, now `isDefault: true` |
| DELETE `/addresses/:id` | — | `{ "message": "Address deleted" }` |

Create body (`line1` + `city` required):

```json
{
  "label": "Home",
  "line1": "12 Allen Avenue",
  "line2": "Flat 3B",
  "city": "Ikeja",
  "state": "Lagos",
  "landmark": "Near Computer Village gate",
  "phone": "08012345678",
  "isDefault": true
}
```

List response `200`:

```json
{
  "items": [ /* address objects */ ],
  "meta": { "total": 3, "page": 1, "limit": 20, "totalPages": 1 }
}
```

`search` matches `label`, `line1`, `line2`, `city`, `state`, `landmark`, `phone`.

Rules:
- First saved address is automatically the default.
- Setting `isDefault: true` (on create, update, or the `/default` route) clears the flag on other addresses — only one default at a time.
- Deleting the default promotes the most recent remaining address to default.
- All routes are scoped to the logged-in customer; another customer's id returns `404`.

---

## 4. Admin — Categories (Admin token)

Category object (admin list adds `_count.meals`):

```json
{
  "id": "cmd...",
  "name": "Signature Jollof",
  "slug": "signature-jollof",
  "image": "https://...",
  "description": "...",
  "status": "ACTIVE",
  "sortOrder": 0,
  "createdAt": "...",
  "updatedAt": "...",
  "_count": { "meals": 6 }
}
```

| Method & path | Body / query | Response |
|---|---|---|
| GET `/admin/categories` | `?search=&status=ACTIVE\|INACTIVE&page=1&limit=20` | `{ items, meta }` — items include `_count.meals` |
| GET `/admin/categories/:id` | — | category object (no `_count`) |
| POST `/admin/categories` | see below | `201` created category |
| PATCH `/admin/categories/:id` | any subset of create body | updated category |
| PATCH `/admin/categories/reorder` | see below | **full** admin list (unpaged, for drag-drop) |
| DELETE `/admin/categories/:id` | — | `{ "message": "Category deleted" }` |

Admin list search matches `name`, `slug`, `description`. Default page size is 20.

Create body (`slug` and `sortOrder` are auto-generated):

```json
{
  "name": "Signature Jollof",
  "image": "https://res.cloudinary.com/...",
  "description": "Classic party jollof",
  "status": "ACTIVE"
}
```

Only `name` is required. `status` is `"ACTIVE"` or `"INACTIVE"`.

Reorder body:

```json
{
  "items": [
    { "id": "cmd...", "sortOrder": 0 },
    { "id": "cmd...", "sortOrder": 1 }
  ]
}
```

Errors: `409` "Cannot delete category with meals. Move or delete meals first." / "Category slug already exists".

---

## 5. Admin — Meals (Admin token)

| Method & path | Body | Response |
|---|---|---|
| GET `/admin/meals` | — | array of all meals (incl. unavailable), with `category` |
| GET `/admin/meals/:id` | — | one meal with `category` |
| POST `/admin/meals` | see below | `201` created meal with `category` |
| PATCH `/admin/meals/:id` | any subset of create body | updated meal with `category` |
| DELETE `/admin/meals/:id` | — | `{ "message": "Meal deleted" }` |

Create body (`name`, `price`, `categoryId` required; `slug` auto-generated):

```json
{
  "name": "Smoky Party Jollof",
  "description": "Firewood-style smoky jollof rice",
  "price": 3500,
  "discountPrice": 3000,
  "categoryId": "cmd...",
  "images": ["https://res.cloudinary.com/.../smoky.webp"],
  "preparationTime": 25,
  "featured": true,
  "bestSeller": false,
  "available": true,
  "ingredients": "Rice, tomatoes, peppers, spices",
  "extras": [
    { "name": "Extra protein", "price": 1500 },
    { "name": "Plantain", "price": 500 }
  ]
}
```

Defaults when omitted: `description ""`, `discountPrice null`, `images []`, `featured false`, `bestSeller false`, `available true`. Send `"discountPrice": null` in PATCH to clear a discount.

Errors: `404` "Category not found", `409` "Meal slug already exists".

---

## 6. Admin — Orders (Admin token)

Admin order objects include the `customer`:

```json
{
  "...order fields as in section 3...": "",
  "customer": {
    "id": "cmd...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Obi",
    "phone": "08012345678"
  }
}
```

| Method & path | Body / query | Response |
|---|---|---|
| GET `/admin/orders` | `?search=&status=PENDING\|PAID\|CANCELLED&page=1&limit=20` | `{ items, meta }` — items include `items` + `customer` |
| GET `/admin/orders/:id` | — | one order with `items` + `customer` |
| PATCH `/admin/orders/:id/status` | `{ "status": "PAID" }` or `{ "status": "CANCELLED" }` | updated order (sets `paidAt` when PAID) |
| DELETE `/admin/orders/:id/items/:itemId` | — | updated order, or `{ "deleted": true, ... }` if last item |

Admin search matches `orderNumber`, `notes`, and customer `email` / `firstName` / `lastName` / `phone`.


Status rules: only `PENDING` orders can change status (`400` "Only pending orders can change status"). Items can only be removed while `PENDING`.

---

## 7. Admin — Settings (Admin token)

### GET `/admin/settings`

Same response as public `GET /settings`.

### PATCH `/admin/settings`

All fields optional — send only what changed:

```json
{
  "restaurantName": "JollofPlate",
  "whatsappNumber": "2348012345678",
  "contactNumber": "08012345678",
  "email": "hello@jollofplate.com",
  "address": "12 Allen Avenue, Ikeja, Lagos",
  "deliveryFee": 1000,
  "businessHours": {
    "timezone": "Africa/Lagos",
    "week": [
      { "day": "monday", "label": "Mon", "open": "09:00", "close": "21:00", "closed": false },
      { "day": "tuesday", "label": "Tue", "open": "09:00", "close": "21:00", "closed": false },
      { "day": "wednesday", "label": "Wed", "open": "09:00", "close": "21:00", "closed": false },
      { "day": "thursday", "label": "Thu", "open": "09:00", "close": "21:00", "closed": false },
      { "day": "friday", "label": "Fri", "open": "09:00", "close": "22:00", "closed": false },
      { "day": "saturday", "label": "Sat", "open": "10:00", "close": "22:00", "closed": false },
      { "day": "sunday", "label": "Sun", "closed": true }
    ]
  },
  "socialLinks": {
    "instagram": "https://instagram.com/jollofplate",
    "facebook": "",
    "twitter": "",
    "tiktok": ""
  }
}
```

`businessHours.week` must contain **all 7 days** when sent. Times are 24h `"HH:mm"`; omit `open`/`close` when `closed: true`.

Response `200`: full updated settings object.

---

## 8. Admin — Uploads (Admin token)

### POST `/admin/uploads`

`multipart/form-data` with field name **`file`**. JPG/PNG/WEBP only, max **5 MB**.

```js
const form = new FormData();
form.append('file', fileInput.files[0]);
await fetch(`${API}/admin/uploads`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` }, // do NOT set Content-Type
  body: form,
});
```

Response `201`:

```json
{
  "url": "https://res.cloudinary.com/.../jollofplate/smoky-jollof.webp",
  "publicId": "jollofplate/smoky-jollof",
  "width": 1200,
  "height": 800,
  "format": "webp"
}
```

Use `url` as the value for `category.image` or `meal.images[]`.

Errors: `400` missing file / wrong type, `503` Cloudinary not configured.

---

## 9. Admin — Stats (Admin token)

### GET `/admin/stats`

Response `200`:

```json
{
  "totalMeals": 24,
  "totalCategories": 7,
  "availableMeals": 20,
  "unavailableMeals": 4,
  "featuredMeals": 5,
  "pendingOrders": 3,
  "paidOrders": 41
}
```

---

## Quick endpoint index

| Endpoint | Method | Auth |
|---|---|---|
| `/auth/register` | POST | Public |
| `/auth/customer/login` | POST | Public |
| `/auth/login` | POST | Public |
| `/auth/verify-email` | POST | Public |
| `/auth/resend-verification` | POST | Customer |
| `/categories` | GET | Public |
| `/meals` | GET | Public |
| `/meals/featured` | GET | Public |
| `/meals/best-sellers` | GET | Public |
| `/meals/:slug` | GET | Public |
| `/meals/:slug/related` | GET | Public |
| `/settings` | GET | Public |
| `/orders` | POST, GET | Customer |
| `/orders/:id` | GET | Customer |
| `/orders/:id/items/:itemId` | DELETE | Customer |
| `/addresses` (+`/:id`, `/:id/default`) | GET, POST, PATCH, DELETE | Customer |
| `/admin/categories` (+`/:id`, `/reorder`) | GET, POST, PATCH, DELETE | Admin |
| `/admin/meals` (+`/:id`) | GET, POST, PATCH, DELETE | Admin |
| `/admin/orders` (+`/:id`, `/:id/status`, `/:id/items/:itemId`) | GET, PATCH, DELETE | Admin |
| `/admin/settings` | GET, PATCH | Admin |
| `/admin/uploads` | POST | Admin |
| `/admin/stats` | GET | Admin |
