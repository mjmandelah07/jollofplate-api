# JollofPlate — Frontend Design Flow

**Status:** Design + implementation guide for `jollofplate-web`  
**Based on:** API as built today (`jollofplate-api`)  
**Brand:** Jollof Red `#C0392B`, Golden `#F39C12`, Green `#145A32`, Cream `#FFF8F0`, Text `#222222`  
**Tagline:** Every Plate Tells a Story.

This doc covers **Public site**, **Customer account**, and **Admin dashboard** flows matching the live API.

> **API reference:** see [`FRONTEND_API.md`](./FRONTEND_API.md) for every endpoint with exact request bodies and response shapes.

---

## 0. App structure (recommended)

```
src/app/
  (public)/
    page.tsx                 # Home
    menu/page.tsx            # Menu / categories
    menu/[slug]/page.tsx     # Meal detail
    cart/page.tsx            # Menu cart (meals only)
    checkout/page.tsx        # Create meal order + WhatsApp
    custom-shopping/page.tsx # Sourcing catalog + list (separate from menu cart)
    custom-shopping/checkout/page.tsx  # Submit sourcing request + WhatsApp quote
    orders/page.tsx          # My meal orders
    orders/[id]/page.tsx
    sourcing-requests/page.tsx       # My custom shopping requests
    sourcing-requests/[id]/page.tsx
    account/page.tsx         # Customer profile, password, saved addresses
    login/page.tsx           # Customer login
    register/page.tsx        # Customer register
    about/page.tsx           # optional
  admin/
    login/page.tsx
    layout.tsx               # admin shell + auth gate
    page.tsx                 # dashboard / stats
    categories/page.tsx
    meals/page.tsx
    meals/new/page.tsx
    meals/[id]/page.tsx
    orders/page.tsx
    orders/[id]/page.tsx
    sourcing-items/page.tsx
    sourcing-requests/page.tsx
    settings/page.tsx
    uploads/ (optional gallery helper)
```

**Auth storage**

| Role | Token | Where |
|------|-------|--------|
| Customer | `customerToken` | httpOnly cookie or localStorage |
| Admin | `adminToken` | separate key; never share with customer |

**API base:** `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001`)

---

## 1. Public site (no login required)

### 1.1 Site chrome

**Header**

- Logo / brand name → Home
- Links: Menu · Cart (badge count) · Orders (if logged in) · Login / Account
- Mobile: hamburger drawer

**Footer** (from `GET /settings`)

- Restaurant name, address, contact, email
- WhatsApp number (tap-to-chat)
- Business hours (`businessHours.week` Mon→Sun)
- Social links
- Delivery fee note

---

### 1.2 Home

**Goal:** Brand first + quick path to order.

**Sections (one job each)**

1. **Hero** — brand, tagline, CTA “Order now” → `/menu`  
2. **Categories** — horizontal cards from `GET /categories` → filter menu by slug  
3. **Featured** — `GET /meals/featured`  
4. **Best sellers** — `GET /meals/best-sellers`  
5. **How it works** — Browse → Cart → WhatsApp pay  
6. **Hours & contact** — from settings  

**APIs**

```
GET /settings
GET /categories?page=1&limit=20
GET /meals/featured
GET /meals/best-sellers
```

**UI notes**

- Meal cards: image, name, price  
- If `discountPrice` set: show ~~`price`~~ + **`discountPrice`** + small “Sale” badge  
- Unavailable meals never appear (API already filters)

---

### 1.3 Menu

**Route:** `/menu`  
**Optional query:** `?category=signature-jollof&search=jollof`

**Layout**

- Left/top: category chips (sorted by `sortOrder`)
- Search input
- Grid of meal cards

**APIs**

```
GET /categories?search={q}&page=1&limit=20
GET /meals?category={slug}&search={q}&page=1&limit=20
```

**Interactions**

- Tap category → refetch meals with `category`  
- Search debounce → `search`  
- Tap card → `/menu/[slug]`  
- Quick “Add” (optional) → opens extras sheet or adds default to cart  

**Empty states**

- No meals in category  
- No search results  

---

### 1.4 Meal detail

**Route:** `/menu/[slug]`

**API**

```
GET /meals/:slug
GET /meals/:slug/related   # You may also like — up to 4
```

**Screen**

- Image gallery (`images[]`)
- Name, description, ingredients
- Prep time
- Pricing: original + sale if discounted
- Extras checklist (`extras`: name + price)
- Quantity stepper
- Primary CTA: **Add to cart**
- Secondary: Back to menu
- **You may also like** — horizontal cards from `/related` (same category first; fills with featured/best-sellers if needed)
- **Share / SEO** — use `meal.share` from `GET /meals/:slug` for dynamic social previews (WhatsApp, Twitter, Facebook, iMessage)

**SEO metadata (Next.js App Router)** — `app/menu/[slug]/page.tsx` or `layout.tsx`:

```ts
// app/menu/[slug]/page.tsx
import type { Metadata } from 'next';

const API = process.env.NEXT_PUBLIC_API_URL!;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meal = await fetch(`${API}/meals/${slug}`, { next: { revalidate: 60 } })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  if (!meal?.share) {
    return { title: 'Menu | JollofPlate' };
  }

  const { title, description, image, url, siteName } = meal.share;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      siteName,
      type: 'website',
      images: image ? [{ url: image, alt: meal.name }] : [],
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : [],
    },
    alternates: { canonical: url },
  };
}
```

WhatsApp / iMessage / Facebook read these tags when the link is shared — so each meal link shows **that meal’s name, description, and image**.

**Cart line item shape (client)**

```ts
{
  mealId: string
  slug: string
  name: string
  unitPrice: number      // discountPrice ?? price
  originalPrice: number  // price
  quantity: number
  extras: { name: string; price: number }[]
  lineTotal: number
  image?: string
}
```

---

### 1.5 Cart (local first)

**Route:** `/cart`  
**State:** client cart (Zustand / context) until checkout creates a server order.

**Show**

- Lines with qty +/−, remove
- Extras under each line
- Subtotal
- Estimated delivery fee (from settings; final fee confirmed on order create)
- Notes field (optional early)
- CTA: **Checkout** → `/checkout`

**Rules**

- Guest can fill cart without login
- Checkout requires **customer login** (orders are account-bound)

---

### 1.6 Custom shopping (sourcing — separate cart)

**Routes:** `/custom-shopping` → `/custom-shopping/checkout`  
**State:** dedicated store (e.g. `sourcingCart`) — **never** share with meal `cart`.

**Goal:** Customer builds a list of items to stock the house. No prices. You quote and confirm on WhatsApp; aim ~24h delivery.

**Browse (`/custom-shopping`)**

- Load `GET /sourcing-items`
- Show name, description, optional image / unit hint — **no price**
- Add from catalog (quantity optional)
- “Can’t find it?” → free-text name (+ optional qty / note)
- CTA: **Review list** → checkout

**Checkout (`/custom-shopping/checkout`)**

- Requires customer JWT
- Delivery address (reuse saved addresses)
- Optional overall notes (“within 24 hours”)
- `POST /sourcing-requests` → open WhatsApp with `checkout.suggestedMessage`
- Copy: “We’ll confirm availability and price on WhatsApp”

**My requests:** `/sourcing-requests` + detail; cancel while pending via `PATCH .../cancel`

---

## 2. Customer account flows

### 2.1 Register

**Route:** `/register`  
**API:** `POST /auth/register`

```json
{
  "email": "customer@example.com",
  "password": "Customer123!",
  "firstName": "Ada",
  "lastName": "Okafor",
  "phone": "2348012345678"
}
```

**On success**

- Save `accessToken` as customer token  
- `customer.emailVerified` is `false` until they click the email link  
- Show “Check your email” toast; optional banner until verified  
- Redirect: intended page (checkout) or `/orders`

**Verify email**

- Route: `/verify-email?token=...`  
- API: `POST /auth/verify-email` `{ "token": "..." }`  
- Resend (logged in): `POST /auth/resend-verification`

---

### 2.2 Login

**Route:** `/login`  
**API:** `POST /auth/customer/login`

```json
{ "email": "...", "password": "..." }
```

**Do not** use `POST /auth/login` here — that is **admin only**.

---

### 2.2b Profile & password

**Route:** `/account`  
**Auth:** customer JWT

**APIs**

```text
GET   /account/profile
PATCH /account/profile
PATCH /account/password
```

**Profile form**

- First name
- Last name
- Phone (optional)
- Email (read-only; show verified/unverified badge)
- Save sends only changed fields to `PATCH /account/profile`

**Password form**

- Current password
- New password (minimum 6 characters)
- Confirm new password (frontend-only validation)
- Submit `currentPassword` + `newPassword` to `PATCH /account/password`

After a successful password update, show a confirmation toast. The current JWT remains valid.

---

### 2.3 Checkout → WhatsApp

**Route:** `/checkout`  
**Auth:** customer JWT required  
**Gate:** if no token → `/login?next=/checkout`

**Steps**

1. Review cart + **delivery address** + notes  
2. Confirm delivery fee display (from settings)  
3. Submit → `POST /orders` (requires `deliveryAddress`)  

```json
{
  "notes": "Extra spicy please",
  "deliveryAddress": {
    "line1": "12 Allen Avenue",
    "line2": "Flat 3B",
    "city": "Ikeja",
    "state": "Lagos",
    "landmark": "Near Computer Village gate",
    "phone": "08012345678"
  },
  "items": [
    {
      "mealId": "...",
      "quantity": 2,
      "extras": [{ "name": "Chicken", "price": 2000 }]
    }
  ]
}
```

4. Response includes `orderNumber`, `total`, `items`, `checkout.whatsappNumber`, `checkout.suggestedMessage`  
5. Clear local cart  
6. Open WhatsApp deep link with the **full order list** in the message:

```
https://wa.me/{whatsappNumber}?text={encodeURIComponent(message)}
```

**Build the message from the order response** (prefer this over the short API `suggestedMessage`, which is only order number + total):

```ts
function buildWhatsAppMessage(order: {
  orderNumber: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes?: string | null;
  deliveryLine1: string;
  deliveryLine2?: string | null;
  deliveryCity: string;
  deliveryState?: string | null;
  deliveryLandmark?: string | null;
  deliveryPhone?: string | null;
  items: { name: string; quantity: number; lineTotal: number; extras?: { name: string; price: number }[] | null }[];
}) {
  const lines = order.items.map((item) => {
    const extras =
      Array.isArray(item.extras) && item.extras.length
        ? ` (+${item.extras.map((e) => e.name).join(', ')})`
        : '';
    return `• ${item.quantity}x ${item.name}${extras} — ₦${item.lineTotal}`;
  });

  const address = [
    order.deliveryLine1,
    order.deliveryLine2,
    order.deliveryCity,
    order.deliveryState,
    order.deliveryLandmark ? `Landmark: ${order.deliveryLandmark}` : null,
    order.deliveryPhone ? `Phone: ${order.deliveryPhone}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `Hello JollofPlate! I want to pay for order ${order.orderNumber}.`,
    '',
    'Items:',
    ...lines,
    '',
    `Subtotal: ₦${order.subtotal}`,
    `Delivery: ₦${order.deliveryFee}`,
    `*Total: ₦${order.total}*`,
    '',
    `Deliver to: ${address}`,
    order.notes ? `Note: ${order.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const message = buildWhatsAppMessage(order);
const phone = order.checkout.whatsappNumber; // or GET /settings
window.open(
  `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
  '_blank',
);
```

Example of what lands in WhatsApp:

```text
Hello JollofPlate! I want to pay for order JP-483920.

Items:
• 2x Smoky Party Jollof (+Extra protein) — ₦9000
• 1x Fried Plantain — ₦1500

Subtotal: ₦10500
Delivery: ₦1000
*Total: ₦11500*

Deliver to: 12 Allen Avenue, Flat 3B, Ikeja, Lagos, Landmark: Near Computer Village gate, Phone: 08012345678
Note: Extra spicy please
```

Fallback: if you skip building the list, use API `checkout.suggestedMessage` (short: order number + total only).

7. Show **Order placed** screen:
   - Order number  
   - Status: Pending payment  
   - Buttons: Open WhatsApp again · View order · Back to menu  
   - “Open WhatsApp again” should rebuild the same message from the stored order (or from `GET /orders/:id` + `GET /settings` for the number)

**Status after create:** `PENDING` until admin marks paid.

---

### 2.4 My orders

**Route:** `/orders`  
**Auth:** customer JWT  
**API:** `GET /orders?search={q}&status=PENDING&page=1&limit=20`  
Response shape: `{ items, meta }` (same pagination as meals).

**List cards**

- Order number  
- Status badge: Pending / Paid / Cancelled  
- Total  
- Date  
- Tap → detail  

---

### 2.5 Order detail (customer)

**Route:** `/orders/[id]`  
**API:** `GET /orders/:id`

**Show**

- Status, items, extras, totals, **delivery address**, notes, paidAt (if any)  
- If `PENDING`:  
  - Remove item → `DELETE /orders/:id/items/:itemId`  
  - **Pay on WhatsApp** → rebuild message with `buildWhatsAppMessage(order)` + `GET /settings` for `whatsappNumber`, then open `wa.me` link (same as checkout)  
- If `PAID` / `CANCELLED`: read-only (no item remove)

**If last pending item removed:** API deletes order → redirect to `/orders` with toast.

---

## 3. Admin dashboard flows

### 3.1 Admin login

**Route:** `/admin/login`  
**API:** `POST /auth/login` (admin)

```json
{ "email": "jollofplate@gamil.com", "password": "Support123!" }
```

**On success**

- Store `adminToken`  
- Redirect `/admin`  
- Protect all `/admin/*` (except login) — if 401/403 → logout  

---

### 3.2 Admin shell

**Sidebar**

- Dashboard  
- Categories  
- Meals  
- Orders (badge = pending count from stats)  
- Settings  
- Logout  

**Top bar:** admin name from login response  

---

### 3.3 Dashboard

**Route:** `/admin`  
**API:** `GET /admin/stats`

**Cards**

- Total meals / categories  
- Available / unavailable meals  
- Featured meals  
- Pending orders  
- Paid orders  

**Quick links**

- View pending orders  
- Add meal  
- Edit settings  

---

### 3.4 Categories

**Route:** `/admin/categories`  
**APIs**

```
GET    /admin/categories?search={q}&status=ACTIVE&page=1&limit=20
POST   /admin/categories
PATCH  /admin/categories/:id
DELETE /admin/categories/:id
PATCH  /admin/categories/reorder
POST   /admin/uploads
```

**List UI**

- Search + status filter + pagination (`items` / `meta`)  
- For reorder: load full list via reorder response (unpaged) or a high `limit`  
- Drag-and-drop rows → call reorder with `{ items: [{ id, sortOrder }] }`  
- Columns: image, name, status, meal count, actions  

**Create / edit form** (no slug / sortOrder fields)

```json
{
  "name": "Signature Jollof",
  "description": "...",
  "image": "https://...",
  "status": "ACTIVE"
}
```

**Image flow**

1. File picker → `POST /admin/uploads` (form-data `file`)  
2. Put returned `url` into `image`  
3. Save category  

**Delete**

- Confirm modal  
- Success toast: `{ message: "Category deleted" }`  
- Blocked if category still has meals (show API error)

---

### 3.5 Meals

**Route:** `/admin/meals`  
**APIs**

```
GET|POST        /admin/meals
GET|PATCH|DELETE /admin/meals/:id
POST            /admin/uploads
```

**List**

- Filters: available / featured / bestSeller / category  
- Columns: image, name, category, price, sale, flags, actions  

**Create / edit form**

- Name, description, category select  
- Price, optional discountPrice (show live preview: ~~4500~~ **4000**)  
- Images (multi upload → URLs array)  
- Prep time, ingredients  
- Extras editor (add rows: name + price)  
- Toggles: available, featured, bestSeller  

**Do not** show slug input (auto from name).

**Delete** → `{ message: "Meal deleted" }`

---

### 3.6 Orders (admin)

**Route:** `/admin/orders`  
**APIs**

```
GET    /admin/orders?search={q}&status=PENDING&page=1&limit=20
GET    /admin/orders/:id
PATCH  /admin/orders/:id/status
DELETE /admin/orders/:id/items/:itemId
```

**List**

- Tabs: All | Pending | Paid | Cancelled  
- Search by order number, notes, address, or customer email/name/phone  
- Pagination (`items` / `meta`)  
- Show customer name/email/phone, order number, **delivery city**, total, date  

**Detail**

- Customer block  
- Items + extras  
- Totals  
- Notes  

**Actions by status**

| Status | Actions |
|--------|---------|
| PENDING | Mark **Paid**, Mark **Cancelled**, Remove item |
| PAID | Read-only |
| CANCELLED | Read-only |

Mark paid body:

```json
{ "status": "PAID" }
```

Cancel:

```json
{ "status": "CANCELLED" }
```

---

### 3.7 Settings

**Route:** `/admin/settings`  
**APIs**

```
GET   /admin/settings
PATCH /admin/settings
```

**Form sections**

1. Identity — restaurantName, email, phones, address  
2. Delivery fee  
3. Business hours — 7 rows Mon→Sun (`open`, `close`, `closed`) + timezone  
4. Social links  

**Hours UI**

- Ordered list (not a free JSON blob)  
- Toggle “Closed” disables open/close inputs  

---

## 4. End-to-end happy paths

### Public browse → WhatsApp pay

```
Home → Menu → Meal detail → Add to cart → Cart
  → Login/Register (if needed) → Checkout
  → POST /orders (PENDING)
  → Open WhatsApp
  → Admin marks PAID
  → Customer sees Paid on /orders/:id
```

### Admin catalog update

```
Admin login → Categories (create + upload image)
  → Meals (create with category + images + discount)
  → Public menu reflects changes
```

### Pending order edit

```
Customer or Admin removes item while PENDING
  → Totals recalculate
  → If last item removed → order gone
```

---

## 5. Screen map (summary)

### Public / customer

| Screen | Auth | Key APIs |
|--------|------|----------|
| Home | — | settings, categories, featured, best-sellers |
| Menu | — | categories, meals |
| Meal detail | — | meals/:slug, meals/:slug/related |
| Cart | — | local |
| Register / Login | — | auth/register, auth/customer/login |
| Checkout | Customer | orders POST, settings |
| My orders | Customer | orders |
| Order detail | Customer | orders/:id, delete item |

### Admin

| Screen | Auth | Key APIs |
|--------|------|----------|
| Login | — | auth/login |
| Dashboard | Admin | admin/stats |
| Categories | Admin | admin/categories*, uploads |
| Meals | Admin | admin/meals*, uploads |
| Orders | Admin | admin/orders* |
| Settings | Admin | admin/settings |

---

## 6. UX / design rules

- Mobile-first; thumb-friendly CTAs  
- Brand colors; avoid generic purple/dashboard chrome on public pages  
- Public first viewport: brand + one CTA + strong food visual  
- Cards only where they aid interaction (meal cards, cart lines, admin tables OK)  
- Prices always ₦ whole Naira  
- Loading skeletons on lists; toasts on success/error  
- Confirm destructive deletes  
- Never mix admin and customer tokens  

---

## 7. Out of scope on frontend (for now)

- Paystack / card pay UI  
- Live rider tracking  
- Referral UI (doc’d in API, not built yet)  
- Discount **percent** field (fixed `discountPrice` works today; % coming later)  
- Promo codes  

---

## 8. Implementation checklist (web)

- [ ] Public layout + settings-driven footer  
- [ ] Home / Menu / Meal detail  
- [ ] Local cart + checkout gate  
- [ ] Customer auth + orders pages  
- [ ] WhatsApp deep link from order response  
- [ ] Admin login + shell  
- [ ] Categories CRUD + reorder + upload  
- [ ] Meals CRUD + upload  
- [ ] Orders list/detail + mark paid/cancel  
- [ ] Settings form with structured hours  
- [ ] Dashboard stats cards  
