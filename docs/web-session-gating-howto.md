# SFCC × Salesforce Loyalty — Web Session-Gating: Developer How-To

This is the build guide for the **web (SFRA)** loyalty integration that gates
static SFCC promotions with real-time session attributes, and how to develop it
end-to-end against **Loyalty Mock Studio** — no SF org, no OCAPI sandbox needed.

> **Two different patterns — don't confuse them.** The `int_loyalty_adapter`
> cartridge injects GPM-computed `PriceAdjustment`s at *cart calculate*. **This**
> design is the opposite: Salesforce Loyalty only decides **who gets which
> promotion code**; the discount math lives in SFCC's native promotion engine,
> switched on per-session by Dynamic Customer Groups. Use this guide for the
> session-gating pattern.

---

## 1. The flow in one picture

```
Login ─▶ Middleware: eligible-promotions(customerNo)
         └▶ ["SFloyalty-20OFFLEGO","SFloyalty-FreeShipping"]
              │
              ▼
   session.custom.loyaltyPromotions = codes.join(",")
              │
              ▼
   Dynamic Customer Group rule: session.custom.loyaltyPromotions CONTAINS "<code>"
     └─ satisfied ─▶ static PMID activates for THIS session
              │
              ▼
   PLP ?pmid=SFloyalty-20OFFLEGO ─▶ LEGO at 20% off + badges
   Cart ─▶ free shipping + stacked badges
```

The promotions, customer groups and campaign bindings are **pre-created once** by
the Middleware via OCAPI Data API (see §5). At runtime the storefront only sets a
lightweight session attribute — everything else is native SFCC.

---

## 2. Point your storefront at the mock

Run the studio and use its base URL as your Middleware / OCAPI host:

```bash
npm install && npm run dev      # http://localhost:3000
```

| # | Endpoint (studio) | Method | Group | Real target |
|---|---|---|---|---|
| 1 | `/api/loyalty/web/eligible-promotions` | GET | Storefront | Loyalty Middleware |
| 2 | `/api/loyalty/web/product-search` | GET | Storefront | SFCC OCAPI Shop `product_search` |
| 3 | `/api/loyalty/web/product-detail` | GET | Storefront | SFCC OCAPI Shop `products/{id}` |
| 4 | `/api/loyalty/web/basket` | GET | Storefront | SFCC OCAPI Shop `baskets/{id}` |
| 5 | `/api/loyalty/ocapi/customer-group` | PUT | Provisioning | OCAPI Data `customer_groups/CG-{code}` |
| 6 | `/api/loyalty/ocapi/promotion` | PUT | Provisioning | OCAPI Data `promotions/{code}` |
| 7 | `/api/loyalty/ocapi/campaign-binding` | PUT | Provisioning | OCAPI Data `campaigns/{c}/promotions|customer_groups/{id}` |

> A cloud SFCC sandbox can't reach `localhost` — tunnel with `ngrok http 3000`
> and point your service URLs at the ngrok host for joint sessions.

---

## 3. Step 1 — Login: fetch eligible promotions, set the session attribute

On authentication, call endpoint (1) and write the codes to the session. The
**raw codes are the only thing that gates**; the `promotions[]` metadata is for
your "My Rewards" surface and badge text.

**SFRA (web) — login controller middleware:**

```javascript
var loyaltyService = require('*/cartridge/scripts/services/loyaltyMiddleware');
// after successful login:
var res = loyaltyService.getEligiblePromotions(customer.profile.customerNo); // -> endpoint (1)
session.custom.loyaltyPromotions = (res.loyaltyPromotions || []).join(',');
// Always write it (even []) so a prior session's codes are cleared on re-login.
```

**OCAPI / mobile parity — `dw.ocapi.shop.auth.afterPOST` hook** sets the same
`session.custom.loyaltyPromotions`.

**Response (fixture `web-eligible-promotions/01`):**

```jsonc
{
  "customerNo": "0007890",
  "loyaltyTier": "Gold",
  "sessionAttribute": "loyaltyPromotions",
  "sessionValue": "SFloyalty-20OFFLEGO,SFloyalty-FreeShipping",
  "loyaltyPromotions": ["SFloyalty-20OFFLEGO", "SFloyalty-FreeShipping"],
  "promotions": [
    { "code": "SFloyalty-20OFFLEGO", "pmid": "SFloyalty-20OFFLEGO", "type": "product",
      "discountPercent": 20, "badge": "20% Loyalty Discount",
      "calloutMsg": "Loyalty Members: 20% Off LEGO",
      "plpUrl": "/s/RefArch/Search-Show?pmid=SFloyalty-20OFFLEGO",
      "customerGroupId": "CG-SFloyalty-20OFFLEGO" },
    { "code": "SFloyalty-FreeShipping", "type": "shipping", "badge": "Free Shipping" }
  ]
}
```

Scenarios: `01` two codes · `02-none` empty (gate closed) · `03-platinum-stacked`
four codes (a different member).

---

## 4. Step 2 — The gating objects (created once by the Middleware)

When a loyalty manager creates a promotion, the Middleware provisions three SFCC
objects via OCAPI Data API. Develop the Middleware's provisioning calls against
endpoints (5)–(7).

**Dynamic Customer Group** (`ocapi-customer-group/01`) — the rule that flips the
PMID on per-session:

```jsonc
{ "id": "CG-SFloyalty-20OFFLEGO",
  "rule": { "_type": "customer_group_rule",
    "conditions": [ { "attribute_path": "session.custom.loyaltyPromotions",
                      "operator": "contains", "value": "SFloyalty-20OFFLEGO" } ] } }
```

> ⚠️ **The operator MUST be `contains` (substring).** `session.custom.loyaltyPromotions`
> is a comma-joined string, so an `is-one-of`/equality operator would match only a
> single-code session and **fail for every stacked member**. This is the #1 gotcha.

**Promotion / PMID** (`ocapi-promotion/01`): `searchable: true` (enables the
`?pmid=` PLP retrieval), `exclusivity: "no"` (allows stacking), native
`start_date`/`end_date`, plus lifecycle metadata `c_isLoyaltyManaged`,
`c_loyaltyStatus`, `c_loyaltyAutoCleanup`.

> **OCAPI reality:** the discount **percentage** is configured in Business
> Manager — it is *not* creatable via OCAPI Data. The studio drives the storefront
> `promotional_price` directly (`list × 0.80`). What round-trips on `PUT
> /promotions/{id}` is id, name, callout_msg, enabled, searchable, exclusivity,
> promotion_class and the `c_` attrs.

**Campaign bindings** — bind BOTH the promotion **and** the customer group to one
persistent, indefinite campaign `Salesforce-Loyalty-Campaign` (two PUTs):
`ocapi-campaign-binding/01` (`campaign_promotion_assignment`) +
`02-customer-group-bound` (`campaign_customer_group_assignment`). One campaign
keeps the object count flat; activation is entirely session-driven.

---

## 5. Step 3 — Product output + badging (the PLP/PDP)

Once the group is satisfied, SFCC returns the PMID as an active product promotion.
Build your PLP tile + PDP against endpoints (2)/(3).

**Gated PLP** (`web-product-search/01-lego-20off-active`) — each hit:

```jsonc
{ "product_id": "lego-star-wars-75300",
  "price": 39.99,                                    // list
  "product_promotions": [
    { "promotion_id": "SFloyalty-20OFFLEGO",
      "callout_msg": "Loyalty Members: 20% Off LEGO", // ← the badge text
      "promotional_price": 31.99 } ],                 // ← member price (list × 0.80)
  "c_loyaltyBadge": "20% Loyalty Discount",           // ← your own badge hook
  "c_isLoyaltyGated": true }
```

Render: strike `price`, show `promotional_price`, print `callout_msg` /
`c_loyaltyBadge`. The **PDP** (`web-product-detail/01-lego-badged`) uses the same
contract on a single `product` document.

**Control** (`web-product-search/02-not-qualified`): identical search with the
code *absent* from the session — `product_promotions: []`, no `c_loyaltyBadge`,
list price only. This is your QA baseline that the gate is closed by default.

---

## 6. Step 4 — Cart: free shipping + stacked badges

Free shipping is a **shipping-level** discount, so it never appears in a product's
`product_promotions`. It surfaces on the basket (`web-basket/01-freeship-applied`):

```jsonc
{ "product_items": [ { "base_price": 39.99, "price": 31.99,
      "price_adjustments": [ { "promotion_id": "SFloyalty-20OFFLEGO", "price": -8.00 } ] } ],
  "shipping_items": [ { "base_price": 7.99, "price": 0.00,
      "price_adjustments": [ { "promotion_id": "SFloyalty-FreeShipping",
                               "callout_msg": "Loyalty Members: Free Shipping", "price": -7.99 } ] } ],
  "shipping_total": 0.00, "order_total": 31.99,
  "c_loyaltyBadges": ["20% Loyalty Discount", "Free Shipping"] }
```

---

## 7. Stacking

Session attributes hold and stack any number of codes at once
(`web-eligible-promotions/03-platinum-stacked` = 4). Each code satisfies its own
Dynamic Customer Group independently; stacking limits come only from each PMID's
`exclusivity`/combinability config in SFCC, never from the gating mechanism.

---

## 8. Lifecycle & cleanup (housekeeping)

PMIDs carry `start_date`/`end_date` (B2C auto-disables at expiry with no code) and
`c_loyaltyStatus` (`ACTIVE` | `EXPIRED` | `ARCHIVED`). Three cleanup triggers:

1. **Webhook** — Loyalty deactivates a promo → Middleware `DELETE`s the PMID + CG.
2. **Cron sweep** (self-healing) — a native SFCC job purges where
   `c_isLoyaltyManaged==true AND c_loyaltyAutoCleanup==true AND end_date older than N days`.
   The record it selects looks like `ocapi-promotion/02-expired` (`enabled:false`,
   past `end_date`, `c_loyaltyStatus:"EXPIRED"`).
3. **Bulk XML overwrite** — weekly `ImportPromotions` reconcile.

**Reusability:** reuse the *same* PMID + group across cohorts/date ranges — the
Middleware just changes which segment gets the code injected. Only create new SFCC
objects for a genuinely new discount type/category.

---

## 9. Scenario map & test hook

Pick a scenario in the GUI, or force one per-request in tests with the
`x-mock-scenario` header:

```bash
curl "http://localhost:3000/api/loyalty/web/product-search?pmid=SFloyalty-20OFFLEGO" \
  -H 'x-mock-scenario: 02-not-qualified'   # prove the gate is closed
```

| Endpoint | Scenarios |
|---|---|
| web-eligible-promotions | `01-lego20-and-freeship` · `02-none` · `03-platinum-stacked` |
| web-product-search | `01-lego-20off-active` · `02-not-qualified` |
| web-product-detail | `01-lego-badged` |
| web-basket | `01-freeship-applied` |
| ocapi-customer-group | `01-created` |
| ocapi-promotion | `01-created` · `02-expired` |
| ocapi-campaign-binding | `01-bound` · `02-customer-group-bound` |

---

## 10. Gotchas (read before you ship)

- **`contains`, not `is-one-of`** on the customer-group rule (§4) — else stacking breaks.
- **Discount % is BM-config**, not OCAPI Data (§4). Don't expect to PUT a percentage.
- **Free shipping ≠ product promotion** — render it from the basket, not the PLP (§6).
- **Always write the session attribute on login**, even when empty, to clear stale codes.
- **These fixtures are reconciled to the design + OCAPI shapes**, not a live org —
  swap in real sample responses (GUI → Save) as soon as you have them.
