import type {
  Cart,
  Mandate,
  Negotiation,
  PolicyDecision,
} from "../../contracts";
import {
  ALL_RULES,
  cartTotalCents,
  fmt,
  toCents,
  type PolicyContext,
  type RuleId,
  type RuleResult,
} from "./rules";

/** The one function B may call: shows a decision, cannot pay. Pure, no I/O. */
export function checkPolicy(
  cart: Cart,
  mandate: Mandate,
  ctx: Partial<PolicyContext> = {},
): PolicyDecision {
  const full: PolicyContext = {
    now: ctx.now ?? new Date(),
    sessionSpent: ctx.sessionSpent ?? 0,
    currentTotal: ctx.currentTotal,
    orderAmount: ctx.orderAmount,
  };
  const failed: RuleResult[] = [];
  for (const [id, rule] of Object.entries(ALL_RULES) as [
    RuleId,
    (typeof ALL_RULES)[RuleId],
  ][]) {
    try {
      const r = rule({ cart, mandate, ctx: full });
      if (!r.passed) failed.push(r);
    } catch {
      failed.push({
        ruleId: id,
        passed: false,
        reason: `Rule ${id} could not be evaluated.`,
      }); // fail closed
    }
  }
  if (failed.length > 0) {
    return {
      verdict: "deny",
      reasons: failed.map((f) => f.reason ?? f.ruleId),
      ruleIds: failed.map((f) => f.ruleId),
    };
  }
  const total = cartTotalCents(cart);
  if (total < toCents(mandate.autoApproveBelow)) {
    return {
      verdict: "allow",
      reasons: [
        `All rules passed and ${fmt(total)} is under the auto-approve threshold.`,
      ],
      ruleIds: [],
    };
  }
  return {
    verdict: "needs_approval",
    reasons: [`All rules passed, but ${fmt(total)} needs human approval.`],
    ruleIds: [],
  };
}

/** FR-A2-26: a settled Negotiation's agreed price becomes the Cart price. The result must still go through checkPolicy + executor. */
export function applyAgreedPrice(cart: Cart, negotiation: Negotiation): Cart {
  if (negotiation.cartId !== cart.id)
    throw new Error("Negotiation does not belong to this Cart.");
  if (negotiation.status !== "settled" || negotiation.agreedPrice === undefined)
    throw new Error("Negotiation is not settled.");
  const agreed = negotiation.agreedPrice;
  if (!Number.isFinite(agreed) || agreed <= 0)
    throw new Error("Agreed price must be greater than zero.");
  if (toCents(agreed) > toCents(negotiation.listedPrice))
    throw new Error("Agreed price cannot exceed the listed price.");
  if (!cart.items.some((i) => i.id === negotiation.itemId))
    throw new Error("Negotiated item is not in the Cart.");
  return {
    ...cart,
    items: cart.items.map((i) =>
      i.id === negotiation.itemId ? { ...i, unitPrice: agreed } : i,
    ),
  };
}
