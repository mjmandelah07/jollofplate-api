# JollofPlate — Discounts, Referrals & Growth Features

**Status:** Decisions locked — ready to implement  
**Related:** [`PRD.md`](./PRD.md)  
**Goal:** Clear original vs sale pricing, support **fixed and %** meal discounts, and grow orders via referrals (WhatsApp checkout stays).

---

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Meal discount input | **Both** — fixed `discountPrice` **or** `discountPercent` |
| Referral reward | Referrer gets **5% off next order** |
| Referral qualifies when | Referred user’s **first order is marked PAID** |
| Rounding (sale from %) | Nearest whole **₦1** |

---

## 1. Discounts (price display)

### What customers should see

When a meal is on discount, the UI shows **both** prices:

| Label | Example | Meaning |
|-------|---------|---------|
| Original / was | ~~₦5,000~~ | Normal `price` |
| Now / sale | **₦4,000** | What they actually pay |
| Badge | `20% OFF` or `Save ₦1,000` | Computed highlight |

If there is **no** active discount → show only the normal price.

### Admin sets discount — fixed **or** percent (both supported)

Admin picks **one mode per meal**:

| Mode | Admin enters | System stores / computes |
|------|----------------|---------------------------|
| **Fixed sale price** | `discountPrice = 4000` | Sale = 4000; `% off` derived for badge |
| **Percentage off** | `discountPercent = 20` | Sale = `round(price × (1 - 20/100))` to nearest ₦1 |

**Rules**

- `price` is always the normal (list) price in whole Naira.
- Sale price must be **≥ 0** and **< price** (0 = free / 100% off).
- `100%` off → show ~~₦5,000~~ and **₦0** (or “Free”), badge `100% OFF`.
- Do **not** send both `discountPrice` and `discountPercent` together — API returns validation error.
- Clear discount by setting both to `null`.
- Extras are **not** auto-discounted in v1.

### API fields (meal)

| Field | Type | Notes |
|-------|------|-------|
| `price` | int | required; normal price |
| `discountPrice` | int? | fixed sale price (mode A) |
| `discountPercent` | int? | 1–100 (mode B) |
| `discountStartsAt` | datetime? | optional schedule (later) |
| `discountEndsAt` | datetime? | optional schedule (later) |
| `discountLabel` | string? | e.g. “Weekend Deal” (later) |

### API response shape (computed for frontend)

```json
{
  "price": 5000,
  "discountPrice": 4000,
  "discountPercent": null,
  "pricing": {
    "originalPrice": 5000,
    "salePrice": 4000,
    "effectivePrice": 4000,
    "percentOff": 20,
    "amountSaved": 1000,
    "isOnSale": true,
    "badge": "20% OFF",
    "mode": "FIXED"
  }
}
```

Percent mode example:

```json
{
  "price": 5000,
  "discountPrice": null,
  "discountPercent": 20,
  "pricing": {
    "originalPrice": 5000,
    "salePrice": 4000,
    "effectivePrice": 4000,
    "percentOff": 20,
    "amountSaved": 1000,
    "isOnSale": true,
    "badge": "20% OFF",
    "mode": "PERCENT"
  }
}
```

Examples:

| price | Input | effectivePrice | badge |
|------:|-------|---------------:|-------|
| 5000 | none | 5000 | — |
| 5000 | `discountPrice` 4000 | 4000 | 20% OFF |
| 5000 | `discountPercent` 50 | 2500 | 50% OFF |
| 5000 | `discountPercent` 100 | 0 | 100% OFF |

### Orders

When creating an order, snapshot:

- `unitPrice` = **effective (sale) price** at order time
- `originalUnitPrice` = list `price` (for receipts: “Was ₦5,000 · Paid ₦4,000”)

### Admin UX

- Toggle: **Fixed price** vs **Percent**
- Live preview: “Customer will see ~~₦5,000~~ **₦4,000** (20% OFF)”
- Optional later: schedule + bulk apply

### Out of scope (discount v1)

- Stackable promo codes + meal discount together
- Per-customer VIP pricing
- BOGO

---

## 2. Referrals

### Locked reward

| Who | Reward |
|-----|--------|
| **Referrer (A)** | **5% off their next order** (after B’s first order is **PAID**) |
| **Referred (B)** | No automatic discount in v1 (can add welcome offer later) |

Qualify only when B’s **first order** is marked **PAID** by admin (not on register, not on pending).

### Flow

1. Customer A gets unique `referralCode` (e.g. `MOJI20`) + share link  
2. Customer B registers with `referralCode` / `?ref=MOJI20`  
3. B places first order; admin marks it **PAID**  
4. A receives a **5% next-order credit** (one-time, auto-applied on A’s next order create)

WhatsApp remains the payment channel.

### Models (draft)

**Customer**

- `referralCode` (unique, auto-generated on register)
- `referredByCustomerId` (nullable)

**Referral**

| Field | Notes |
|-------|--------|
| referrerId | Customer A |
| referredId | Customer B |
| status | `PENDING` → `QUALIFIED` → `REWARDED` / `REJECTED` |
| qualifiedOrderId | B’s first paid order |
| referrerRewardPercent | `5` |

**CustomerReward** (or credit on Customer)

| Field | Notes |
|-------|--------|
| customerId | Referrer A |
| type | `NEXT_ORDER_PERCENT` |
| percent | `5` |
| status | `AVAILABLE` → `APPLIED` / `EXPIRED` |
| sourceReferralId | link back |
| appliedOrderId | when used |

### Applying the 5% on next order

1. On `POST /orders` for A, if they have an `AVAILABLE` next-order 5% reward:
2. Apply 5% off **order subtotal** (before or after delivery fee — **decide: off subtotal only**)
3. Mark reward `APPLIED` and store `discountAmount` on the order
4. One reward per successful referral; unused rewards can expire later (optional)

### API surface (draft)

```
GET    /me/referral                     # my code, link, stats, available reward
POST   /auth/register                   # optional body.referralCode
GET    /admin/referrals                 # list / filter
PATCH  /admin/referrals/:id/status      # void / reject abuse
```

### Anti-abuse

- Self-referral blocked
- Code only for **new** accounts
- Reward only after referred user’s **first PAID** order
- One referral reward per referred customer
- Admin can reject suspicious referrals
- Optional later: min order total (e.g. ₦3,000) to qualify

### Frontend / WhatsApp copy

```text
Share JollofPlate with friends!
Use my code MOJI20 when you sign up.
When you complete your first paid order,
I get 5% off my next order.
```

Share link: `https://jollofplate.com/register?ref=MOJI20`

---

## 3. Other ideas (prioritized)

### P0 — High value

| Idea | Why |
|------|-----|
| **Promo codes** | Sitewide codes like `JOLLOF10` |
| **Order again** | Reorder from past paid orders |
| **Deals section** | Home row from `pricing.isOnSale` |

### P1 — Growth

| Idea | Why |
|------|-----|
| **Loyalty points** | Earn/redeem |
| **Birthday plate** | Time-boxed % off |
| **Favorites** | Faster checkout |
| **Reviews after paid** | Trust |

### P2 — Ops

| Idea | Why |
|------|-----|
| Free delivery over threshold | AOV |
| Order timeline (Preparing → Ready) | Ops clarity |
| Receipt share image | Transfers |

### P3 — Later

Paystack, multi-branch, rider tracking, subscriptions.

---

## 4. Build order

1. Meal **`discountPercent`** + validation (fixed XOR percent)  
2. Computed **`pricing`** on meal responses  
3. Snapshot `originalUnitPrice` / effective price on **OrderItem**  
4. Customer **`referralCode`** + register with optional code  
5. On admin **PAID**, qualify referral → create **5% next-order** reward for referrer  
6. Apply reward on referrer’s next `POST /orders`  
7. Web: deals UI + referral share screen  

---

## 5. Success metrics

- % of meals/orders using discounts  
- Referred signups → first paid orders  
- Referrer reward redemption rate  
- AOV with vs without discount  

---

## 6. Example customer UI copy

```text
Party Jollof
₦4,000  ~~₦5,000~~
20% OFF · Weekend Deal
```

```text
Invite friends → get 5% off your next order
They sign up with your code; you earn the reward
after their first paid order.
Your code: MOJI20
```
