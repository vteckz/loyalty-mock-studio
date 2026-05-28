# Loyalty Mock Studio

A local Salesforce Loyalty API mock with a GUI on top, built for the SFCC cartridge developer who has to integrate against Loyalty before the SF org is even ready.

Run it on `localhost`, point your SFCC service definitions at it, and develop the whole flow — Promotion Evaluation → Promotion Execution → Voucher lifecycle → Member Info — without a real SF sandbox.

## Why this exists

The proposed integration has SFCC consuming the Loyalty Promotion Evaluation / Execution APIs and injecting `PriceAdjustment` objects into the cart at calculate-time, plus a separate voucher fetch/reserve/redeem/release flow as a payment method. Both flows need realistic responses to develop against. This studio gives you those without needing the sandbox.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

- **Top tabs** — every mocked endpoint
- **Left** — the scenarios available for that endpoint (each is one JSON file in `fixtures/`)
- **Middle** — Monaco editor: edit the response, change HTTP status, inject latency, save back to disk
- **Right** — live request log streamed over SSE; click a row to see headers, request body and response body

The green dot next to a scenario = the one your cartridge calls will currently receive.

## Mocked endpoints

These shapes were reconciled against the official **Loyalty Management Developer Guide** (Summer '26). The two promotion endpoints map to **Global Promotions Management (GPM)**; the voucher/member endpoints to the standard Loyalty Connect API.

| Method | Studio URL | Real SF path |
|---|---|---|
| POST | `/api/oauth/token` | `/services/oauth2/token` |
| POST | `/api/loyalty/promotion-execution` | `/global-promotions-management/promotion-execution` |
| POST | `/api/loyalty/get-member-promotions` | `…/program-processes/GetMemberPromotions` |
| POST | `/api/loyalty/promotion-reward` | `/global-promotions-management/promotion-reward` |
| GET | `/api/loyalty/vouchers` | `…/loyalty/programs/{program}/members/{membershipNumber}/vouchers` |
| POST | `/api/loyalty/vouchers/redeem` | `…/vouchers/{voucherCode}/redeem` |
| GET | `/api/loyalty/members` | `/loyalty-programs/{program}/members` |
| GET | `/api/loyalty/transaction-history` | `…/connect/loyalty/programs/{program}/transaction-history` |

**Promotion Evaluation & Execution** is the core pricing call: send a cart, get back the adjusted cart + line items with discount amounts already computed (`adjustedCartAmount`, per-line `totalCartLineItemDiscountAmount`). **Promotion Reward Application** is the order-placement accrual step.

**Get Member Promotions** is the *alternative* pricing path (still an open question for the Salesforce side). It's a program process returning the member's eligible promotions rather than a priced cart — its shape is implementer-defined, so those fixtures are a plausible default, not doc-confirmed. The adapter switches to it by setting `LoyaltyConfig.PROMOTION_API = 'GET_MEMBER_PROMOTIONS'`.

### Promotion API switch (header)

The header has a **Promotion API** toggle — `Auto | GPM | GetMember` — that mirrors the adapter's `LoyaltyConfig.PROMOTION_API`. It can't reach into the cartridge (that config lives in the SFCC code), but it makes the studio match the mode you're testing:

- **Auto** (default) — both promotion endpoints answer normally.
- **GPM** / **GetMember** — the chosen promotion endpoint answers normally; the *other* one returns a **409** with a message pointing at `LoyaltyConfig.PROMOTION_API`. So if the cartridge is pointed at the wrong resource for the mode you set, you find out loudly instead of via a silent wrong answer. The guarded tab is dimmed and badged `409`; the active one is badged `mode`.

> **Two things to know vs. the original proposal.** (1) There is **no voucher reserve/release** in the standard API — a voucher goes Issued → Redeemed, so the cart just holds the chosen `voucherCode` and redeems it at order placement. (2) **BOGOF is modelled as a discount on a line already in the cart**, not as an injected product — see the `04-bogof-as-line-discount` fixture. Injecting a product the shopper didn't add isn't expressible in this API and is an open question for the Salesforce-side team.

## How a request gets answered

1. Cartridge calls e.g. `POST localhost:3000/api/loyalty/promotion-execution`
2. Handler looks up the active scenario for `promotion-execution`
3. Applies any `latencyMs` from the scenario
4. Returns the scenario's `response.status` + `response.body`
5. Logs the full request/response to the studio (visible in the right panel)

### Forcing a specific scenario per request

If you want to pick a scenario without using the GUI (for automated tests), pass a header:

```bash
curl -X POST http://localhost:3000/api/loyalty/promotion-execution \
  -H 'content-type: application/json' \
  -H 'x-mock-scenario: 04-bogof-as-line-discount' \
  -d '{}'
```

This is what the **contract test harness** should do — every fixture file becomes one test case that asserts the cartridge handles that response correctly.

## Adding / editing scenarios

Two ways:

1. **In the GUI** — pick the scenario, edit in Monaco, click **Save**. The studio writes back to `fixtures/<endpoint>/<id>.json`. Commit the diff.
2. **In your editor** — drop a new `.json` file into `fixtures/<endpoint>/`. Schema:

   ```jsonc
   {
     "name": "Human-readable name shown in the GUI",
     "description": "What this scenario is for",
     "request": { "body": { /* informational only — example of what produced this response */ } },
     "response": {
       "status": 200,
       "headers": { /* optional */ },
       "body": { /* whatever JSON SF would return */ }
     },
     "latencyMs": 800,        // optional — artificial delay
     "notes": "Edge cases the dev should test against"  // optional
   }
   ```

   Reload the GUI tab — the file appears.

## Suggested workflow for the SFCC dev

1. **Configure SFCC service** to point at `http://localhost:3000` (or the ngrok host). One service definition per endpoint.
2. **Wire the OAuth client** to `/api/oauth/token`. Pick the `01-success` scenario and confirm the cartridge caches and re-uses the token.
3. **Build the Promotion Applier** against `/api/loyalty/promotion-execution`. Cycle scenarios in the GUI and confirm:
   - `01-line-and-cart-discounts` → cartridge applies each line's `totalCartLineItemDiscountAmount` as an `AmountDiscount`; basket total lands on `adjustedCartAmount`
   - `02-single-line-percentage` → simplest happy path, one discounted line
   - `03-no-promotions` → cartridge clears any prior `LOYALTY_*` adjustments (cart returned unchanged)
   - `04-bogof-as-line-discount` → the free item is a discount on a line already in the cart (no product injection)
   - `05-error-gpm-not-enabled` → cartridge falls through to non-loyalty pricing, does NOT error the cart
4. **Order placement** → `/api/loyalty/promotion-reward` (accrue) + `/api/loyalty/vouchers/redeem`.
5. **Voucher flow** — list (`?voucherStatus=Issued`) → apply as a basket adjustment → redeem at order placement. The `03-mixed-statuses` fixture tests that you only offer `status=Issued`. There is no reserve/release.

## State persistence

- The **active scenario per endpoint** lives in memory. Restart the dev server = everything resets to "first fixture per endpoint".
- The **request log** is an in-memory ring buffer (200 entries).
- **Fixture files are on disk** — Save in the GUI = git diff = PR.

If you want the active selection to survive restarts, that's the natural next feature.

## File layout

```
loyalty-mock-studio/
├── fixtures/                          # All scenarios (commit these)
│   ├── oauth-token/
│   ├── promotion-execution/
│   ├── promotion-reward/
│   ├── voucher-list/
│   ├── voucher-redeem/
│   ├── member-info/
│   └── transaction-history/
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── oauth/token/              # OAuth mock
    │   │   ├── loyalty/...               # 6 Loyalty endpoints
    │   │   └── studio/                   # GUI control API (don't call from cartridge)
    │   └── page.tsx                      # The GUI
    ├── components/studio/                # GUI pieces
    └── lib/
        ├── endpoints.ts                  # Endpoint registry (add new ones here)
        ├── handler.ts                    # Shared scenario-lookup + response logic
        ├── fixtures.ts                   # JSON file I/O
        └── state.ts                      # In-memory active-scenario + request log
```

## Caveats — fixtures reconciled to docs, not a live org

The fixtures were rewritten to match the shapes in the official **Loyalty Management Developer Guide** (Summer '26) — the promotion fixtures mirror the guide's own Cart example. They were **not derived from a real sandbox**, and two things still need confirmation from whoever builds the Loyalty side: (1) whether they use this GPM "Promotion Evaluation and Execution" resource vs. a Loyalty `GetMemberPromotions` program process, and (2) how/whether a "free product the shopper didn't add" is expressed. As soon as you have real sample responses, paste them into the GUI and **Save** — the studio doesn't care what's in the body.
