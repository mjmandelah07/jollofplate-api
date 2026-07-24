# JollofPlate — Frontend Design Flow

**Status:** Design + implementation guide for `jollofplate-web`  
**Based on:** API as built today (`jollofplate-api`)  
**Brand:** Jollof Red `#C0392B`, Golden `#F39C12`, Green `#145A32`, Cream `#FFF8F0`, Text `#222222`  
**Tagline:** Every Plate Tells a Story.

This doc covers **Public site**, **Customer account**, and **Admin dashboard** flows matching the live API.

---

## 0. App structure (recommended)

```
src/app/
  (public)/
    page.tsx                 # Home
    menu/page.tsx            # Menu / categories
    menu/[slug]/page.tsx     # Meal detail
    cart/page.tsx            # Cart
    checkout/page.tsx        # Create order + WhatsApp
    orders/page.tsx          # My orders (customer JWT)
    orders/[id]/page.tsx     # Order detail
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
GET /categories
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
GET /categories
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
- Redirect: intended page (checkout) or `/orders`

---

### 2.2 Login

**Route:** `/login`  
**API:** `POST /auth/customer/login`

```json
{ "email": "...", "password": "..." }
```

**Do not** use `POST /auth/login` here — that is **admin only**.

---

### 2.3 Checkout → WhatsApp

**Route:** `/checkout`  
**Auth:** customer JWT required  
**Gate:** if no token → `/login?next=/checkout`

**Steps**

1. Review cart + notes  
2. Confirm delivery fee display (from settings)  
3. Submit → `POST /orders`  

```json
{
  "notes": "Extra spicy please",
  "items": [
    {
      "mealId": "...",
      "quantity": 2,
      "extras": [{ "name": "Chicken", "price": 2000 }]
    }
  ]
}
```

4. Response includes `orderNumber`, `total`, `checkout.whatsappNumber`, `checkout.suggestedMessage`  
5. Clear local cart  
6. Open WhatsApp deep link:

```
https://wa.me/{whatsappNumber}?text={encodeURIComponent(suggestedMessage)}
```

Prefer API `suggestedMessage`; frontend may enrich with address if you collect it in UI notes.

7. Show **Order placed** screen:
   - Order number  
   - Status: Pending payment  
   - Buttons: Open WhatsApp again · View order · Back to menu  

**Status after create:** `PENDING` until admin marks paid.

---

### 2.4 My orders

**Route:** `/orders`  
**Auth:** customer JWT  
**API:** `GET /orders`

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

- Status, items, extras, totals, notes, paidAt (if any)  
- If `PENDING`:  
  - Remove item → `DELETE /orders/:id/items/:itemId`  
  - “Pay on WhatsApp” button again  
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
GET    /admin/categories
POST   /admin/categories
PATCH  /admin/categories/:id
DELETE /admin/categories/:id
PATCH  /admin/categories/reorder
POST   /admin/uploads
```

**List UI**

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
GET    /admin/orders?status=PENDING
GET    /admin/orders/:id
PATCH  /admin/orders/:id/status
DELETE /admin/orders/:id/items/:itemId
```

**List**

- Tabs: All | Pending | Paid | Cancelled  
- Show customer name/email/phone, order number, total, date  

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
| Meal detail | — | meals/:slug |
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
