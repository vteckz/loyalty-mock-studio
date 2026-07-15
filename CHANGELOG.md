# Changelog

All notable changes to **Loyalty Mock Studio**. Newest first.

## 0.5.0 (2026-07-16)

### Added
- **Web session-gating mock set** (7 endpoints, 13 fixtures) for the alternative
  SFCC × Salesforce Loyalty pattern, where a Loyalty Middleware returns eligible
  promotion *codes* on login, the storefront writes them to
  `session.custom.loyaltyPromotions`, and SFCC Dynamic Customer Groups activate
  pre-built static promotions (PMIDs) per session:
  - **Storefront** group, `web-eligible-promotions` (login gate → codes),
    `web-product-search` (gated PLP + badging, with a not-qualified control),
    `web-product-detail` (PDP badging), `web-basket` (free shipping + stacked badges).
  - **Provisioning** group, `ocapi-customer-group` (dynamic group with a
    `contains` rule), `ocapi-promotion` (PMID + lifecycle metadata, plus an
    expired variant for the cleanup path), `ocapi-campaign-binding` (promotion +
    customer-group binds to one persistent campaign).
- `docs/web-session-gating-howto.md`, end-to-end developer guide for the web pattern.
- Endpoint tab bar groups endpoints by function; two new groups (Storefront,
  Provisioning). **44 endpoints across 11 groups** total.

### Notes
- The web-gating set was reviewed by a multi-lens verification pass. Fixes applied:
  corrected the customer-group rule operator to `contains` (required for stacked,
  comma-joined session values), removed non-OCAPI promotion fields, and added the
  free-shipping basket, expired-PMID, and second campaign-bind fixtures.

## 0.4.1 (2026-06-15)

### Changed
- Genericized third-party brand names from Salesforce doc examples in fixtures to
  neutral placeholders. No client, company, or org-specific identifiers remain.

### Removed
- Agent instructions config file.

## 0.4.0 (2026-06-02)

### Added
- README screenshot and a link to the companion `int_loyalty_adapter` cartridge.

### Changed
- README file layout + "add an endpoint" steps; clarified the GetMemberPromotions
  response envelope is doc-confirmed.

## 0.3.0 (2026-05-29)

### Added
- **Full out-of-the-box Loyalty Management Business API surface**, 37 endpoints
  across 9 groups, each reconciled against the Loyalty Management Developer Guide
  v67.0 (Summer '26).
- In-app developer guide (slide-over): wiring, scenarios, the promotion-API mode
  switch, and the `x-mock-scenario` test header. Opens on first visit.
- Voucher reserve / reinstate / redeem action fixtures (Redeem Voucher resource,
  API v62.0+).

### Fixed
- Transaction History corrected to POST (was GET).
- Response bodies matched to the guide: Redeem Voucher Output, Member Profile
  Output, Transaction Journal History Output.
- `get-member-promotions` and `promotion-reward` fixtures corrected to the
  documented shapes.

## 0.1.0 (2026-05-28)

### Added
- Initial Loyalty Mock Studio: fixture-driven mock server (8 Salesforce Loyalty
  endpoints) plus a GUI, endpoint tabs, scenario editor, Monaco JSON editor, live
  SSE request log, and a promotion-API mode switch.
