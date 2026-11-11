import { Cart } from "@/contracts/cart.js";
import { Mandate } from "@/contracts/mandate.js";
import { PolicyDecision } from "@/contracts/policy-decision.js";

/**
 * Policy Engine stub for Person A
 */
export function evaluatePolicy(cart: Cart, mandate: Mandate): PolicyDecision {
  const reasons: string[] = [];
  const ruleIds: string[] = [];

  // Per purchase cap check
  if (cart.total > mandate.maxPerPurchase) {
    reasons.push(`Cart total ($${cart.total.toFixed(2)}) exceeds max per-purchase cap ($${mandate.maxPerPurchase.toFixed(2)})`);
    ruleIds.push("RULE_PER_PURCHASE_CAP");
    return {
      verdict: "deny",
      reasons,
      ruleIds,
      evaluatedAt: new Date().toISOString(),
    };
  }

  // Auto-approve below check
  if (cart.total <= mandate.autoApproveBelow) {
    reasons.push(`Cart total ($${cart.total.toFixed(2)}) is below auto-approve threshold ($${mandate.autoApproveBelow.toFixed(2)})`);
    ruleIds.push("RULE_AUTO_APPROVE");
    return {
      verdict: "allow",
      reasons,
      ruleIds,
      evaluatedAt: new Date().toISOString(),
    };
  }

  reasons.push("Requires human confirmation before sandbox settlement");
  ruleIds.push("RULE_HUMAN_APPROVAL_REQUIRED");
  return {
    verdict: "needs_approval",
    reasons,
    ruleIds,
    evaluatedAt: new Date().toISOString(),
  };
}
