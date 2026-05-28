import type { EndpointMeta, PromotionMode } from "@/types/studio";

/** The two interchangeable promotion-pricing endpoints the mode switch governs. */
export const PROMOTION_ENDPOINT_IDS = ["promotion-execution", "get-member-promotions"];

/**
 * The promotion endpoint that should answer for a given mode.
 * "auto" returns null = both endpoints answer normally (no guarding).
 */
export function activePromotionEndpoint(mode: PromotionMode): string | null {
  if (mode === "gpm") return "promotion-execution";
  if (mode === "gmp") return "get-member-promotions";
  return null;
}

export const ENDPOINTS: EndpointMeta[] = [
  {
    id: "oauth-token",
    name: "OAuth Token",
    method: "POST",
    mockPath: "/api/oauth/token",
    sfPath: "/services/oauth2/token",
    description:
      "Salesforce OAuth 2.0 token endpoint. Returns a fake bearer token the cartridge can cache and re-use.",
  },
  {
    id: "promotion-execution",
    name: "Promotion Evaluation & Execution",
    method: "POST",
    mockPath: "/api/loyalty/promotion-execution",
    sfPath: "/services/data/v65.0/global-promotions-management/promotion-execution",
    description:
      "THE pricing call. Send a cart; get back the adjusted cart + line items with the discount amounts already computed. Requires Global Promotions Management (GPM) in the real org.",
  },
  {
    id: "get-member-promotions",
    name: "Get Member Promotions (alt)",
    method: "POST",
    mockPath: "/api/loyalty/get-member-promotions",
    sfPath:
      "/services/data/v65.0/connect/loyalty/programs/{programName}/program-processes/GetMemberPromotions",
    description:
      "ALTERNATIVE to Promotion Evaluation & Execution (set the adapter's PROMOTION_API to GET_MEMBER_PROMOTIONS). A program process returning the member's eligible promotions. The response shape is IMPLEMENTER-DEFINED — these fixtures are a plausible default, not doc-confirmed.",
  },
  {
    id: "promotion-reward",
    name: "Promotion Reward Application",
    method: "POST",
    mockPath: "/api/loyalty/promotion-reward",
    sfPath: "/services/data/v65.0/global-promotions-management/promotion-reward",
    description:
      "Order-placement step: create transaction journals for the order and accrue the promotion rewards (points, vouchers, etc.).",
  },
  {
    id: "voucher-list",
    name: "Member Vouchers",
    method: "GET",
    mockPath: "/api/loyalty/vouchers",
    sfPath:
      "/services/data/v58.0/loyalty/programs/{programName}/members/{membershipNumber}/vouchers",
    description:
      "Returns the vouchers issued to a member. Filter with ?voucherStatus=Issued. Statuses: Issued | Reserved | Redeemed | Expired | Cancelled.",
  },
  {
    id: "voucher-redeem",
    name: "Voucher Action (Reserve / Reinstate / Redeem)",
    method: "POST",
    mockPath: "/api/loyalty/vouchers/redeem",
    sfPath:
      "/services/data/v62.0/loyalty/programs/{programName}/members/{membershipNumber}/vouchers/{voucherCode}/redeem",
    description:
      "One resource, three actions via the body `action` field (type ReservationAction, since API v62.0): Reserve (Issued→Reserved, returns a reservationKey), Reinstate (Reserved→Issued, the 'release'), Redeem (→Redeemed; default when no action is sent). Pick the matching scenario per action.",
  },
  {
    id: "member-info",
    name: "Member Info",
    method: "GET",
    mockPath: "/api/loyalty/members",
    sfPath: "/services/data/v67.0/loyalty-programs/{programName}/members",
    description:
      "Member lookup by ?membershipNumber=. Path is doc-confirmed; the body below is illustrative — confirm fields against the org.",
  },
  {
    id: "transaction-history",
    name: "Transaction History",
    method: "POST",
    mockPath: "/api/loyalty/transaction-history",
    sfPath: "/services/data/v67.0/connect/loyalty/programs/{programName}/transaction-history",
    description:
      "Recent transaction journals for the member. POST (not GET) with a body { membershipNumber, journalType: Accrual|Redemption, periodStartDate, periodEndDate } + ?page=. Path + method are doc-confirmed; the response body below is illustrative.",
  },
];

export function getEndpoint(id: string): EndpointMeta | undefined {
  return ENDPOINTS.find((e) => e.id === id);
}
