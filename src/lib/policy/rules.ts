import type { Cart, Mandate } from "../../contracts";

export type RuleId =
  | "per_purchase_cap"
  | "session_cap"
  | "category_allow_list"
  | "blocked_merchants"
  | "delivery_date"
  | "mandate_not_expired"
  | "price_unchanged"
  | "amount_match";

export interface PolicyContext {
  now: Date;
  sessionSpent: number; // USD already captured in this session
  currentTotal?: number; // USD, live price at capture time (FR-A2-14)
  orderAmount?: number; // USD, amount on the PayPal order (FR-A2-15)
}
export interface RuleInput {
  cart: Cart;
  mandate: Mandate;
  ctx: PolicyContext;
}
export interface RuleResult {
  ruleId: RuleId;
  passed: boolean;
  reason?: string;
}
export type Rule = (input: RuleInput) => RuleResult;

// ---- money: integer cents everywhere, so 0.1 + 0.2 never bites us ----
export const toCents = (usd: number): number => Math.round(usd * 100);
export const fmt = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
export const cartTotalCents = (cart: Cart): number =>
  cart.items.reduce((sum, i) => sum + toCents(i.unitPrice) * i.quantity, 0);

const pass = (ruleId: RuleId): RuleResult => ({ ruleId, passed: true });
const fail = (ruleId: RuleId, reason: string): RuleResult => ({
  ruleId,
  passed: false,
  reason,
});
const norm = (s: string) => s.trim().toLowerCase();
// NOTE: comparisons are written as !(a <= b) so NaN fails closed.

// FR-A2-8
export const perPurchaseCap: Rule = ({ cart, mandate }) => {
  const total = cartTotalCents(cart);
  if (!Number.isFinite(total) || total <= 0)
    return fail("per_purchase_cap", "Cart total must be greater than zero.");
  const max = toCents(mandate.maxPerPurchase);
  return total <= max
    ? pass("per_purchase_cap")
    : fail(
        "per_purchase_cap",
        `Cart total ${fmt(total)} exceeds the per-purchase cap of ${fmt(max)}.`,
      );
};

// FR-A2-9
export const sessionCap: Rule = ({ cart, mandate, ctx }) => {
  const projected = toCents(ctx.sessionSpent) + cartTotalCents(cart);
  const max = toCents(mandate.maxSessionTotal);
  return projected <= max
    ? pass("session_cap")
    : fail(
        "session_cap",
        `Session total would reach ${fmt(projected)}, above the session cap of ${fmt(max)}.`,
      );
};

// FR-A2-10 (fail-closed: empty allow-list allows nothing)
export const categoryAllowList: Rule = ({ cart, mandate }) => {
  const allowed = new Set(mandate.allowedCategories.map(norm));
  const bad = [
    ...new Set(
      cart.items
        .filter((i) => !allowed.has(norm(i.category)))
        .map((i) => i.category),
    ),
  ];
  return bad.length === 0
    ? pass("category_allow_list")
    : fail(
        "category_allow_list",
        `Category not allowed by the Mandate: ${bad.join(", ")}.`,
      );
};

// FR-A2-11
export const blockedMerchants: Rule = ({ cart, mandate }) => {
  const blocked = new Set(mandate.blockedMerchants.map(norm));
  const bad = [
    ...new Set(
      cart.items
        .filter((i) => blocked.has(norm(i.merchant)))
        .map((i) => i.merchant),
    ),
  ];
  return bad.length === 0
    ? pass("blocked_merchants")
    : fail(
        "blocked_merchants",
        `Merchant blocked by the Mandate: ${bad.join(", ")}.`,
      );
};

// FR-A2-12 (only when deliverBy is set; unknown delivery date fails closed)
export const deliveryDate: Rule = ({ cart, mandate }) => {
  if (!mandate.deliverBy) return pass("delivery_date");
  if (!cart.estimatedDelivery)
    return fail(
      "delivery_date",
      "Delivery date unknown, but the Mandate requires delivery by a deadline.",
    );
  const eta = Date.parse(cart.estimatedDelivery);
  const by = Date.parse(mandate.deliverBy);
  return eta <= by
    ? pass("delivery_date")
    : fail(
        "delivery_date",
        `Estimated delivery ${cart.estimatedDelivery} is after the deadline ${mandate.deliverBy}.`,
      );
};

// FR-A2-13 (expiresAt itself counts as expired)
export const mandateNotExpired: Rule = ({ mandate, ctx }) =>
  ctx.now.getTime() < Date.parse(mandate.expiresAt)
    ? pass("mandate_not_expired")
    : fail("mandate_not_expired", `Mandate expired at ${mandate.expiresAt}.`);

// FR-A2-14 (runs only when a live price is supplied, i.e. at capture)
export const priceUnchanged: Rule = ({ cart, ctx }) => {
  if (ctx.currentTotal === undefined) return pass("price_unchanged");
  const now = toCents(ctx.currentTotal),
    then = cartTotalCents(cart);
  return now === then
    ? pass("price_unchanged")
    : fail(
        "price_unchanged",
        `Price changed since the Cart was created (${fmt(then)} to ${fmt(now)}).`,
      );
};

// FR-A2-15 (runs only when a PayPal order amount is supplied)
export const amountMatch: Rule = ({ cart, ctx }) => {
  if (ctx.orderAmount === undefined) return pass("amount_match");
  const order = toCents(ctx.orderAmount),
    cartC = cartTotalCents(cart);
  return order === cartC
    ? pass("amount_match")
    : fail(
        "amount_match",
        `PayPal order amount ${fmt(order)} does not match the Cart total ${fmt(cartC)}.`,
      );
};

export const ALL_RULES: Record<RuleId, Rule> = {
  per_purchase_cap: perPurchaseCap,
  session_cap: sessionCap,
  category_allow_list: categoryAllowList,
  blocked_merchants: blockedMerchants,
  delivery_date: deliveryDate,
  mandate_not_expired: mandateNotExpired,
  price_unchanged: priceUnchanged,
  amount_match: amountMatch,
};
