import { Cart } from "@/contracts/cart.js";
import { Mandate } from "@/contracts/mandate.js";
import { PolicyDecision, PolicyDecisionSchema } from "@/contracts/policy-decision.js";
import {
  PolicyContext,
  rulePerPurchaseCap,
  ruleSessionCap,
  ruleCategoryAllowList,
  ruleBlockedMerchants,
  ruleMandateNotExpired,
  rulePriceDrift,
  rulePayPalParity,
} from "./rules.js";

export function evaluatePolicy(
  cart: Cart,
  mandate: Mandate,
  context?: PolicyContext
): PolicyDecision {
  const rules = [
    rulePerPurchaseCap,
    ruleSessionCap,
    ruleCategoryAllowList,
    ruleBlockedMerchants,
    ruleMandateNotExpired,
    rulePriceDrift,
    rulePayPalParity,
  ];

  const failedRules = [];
  const passedRules = [];
  const reasons: string[] = [];
  const ruleIds: string[] = [];

  for (const rule of rules) {
    const result = rule(cart, mandate, context);
    if (!result.passed) {
      failedRules.push(result);
      reasons.push(result.reason);
      ruleIds.push(result.ruleId);
    } else {
      passedRules.push(result);
    }
  }

  // If any hard guardrail failed, deny
  if (failedRules.length > 0) {
    return PolicyDecisionSchema.parse({
      verdict: "deny",
      reasons,
      ruleIds,
      evaluatedAt: new Date().toISOString(),
    });
  }

  // Check autonomous spending threshold (autoApproveBelow)
  if (mandate.autoApproveBelow > 0 && cart.total <= mandate.autoApproveBelow) {
    return PolicyDecisionSchema.parse({
      verdict: "allow",
      reasons: [
        `Cart total ($${cart.total.toFixed(2)}) is inside pre-authorized threshold ($${mandate.autoApproveBelow.toFixed(2)}). Zero-click autonomous approval granted.`,
      ],
      ruleIds: ["RULE_AUTO_APPROVE_THRESHOLD"],
      evaluatedAt: new Date().toISOString(),
    });
  }

  // Otherwise requires human approval
  return PolicyDecisionSchema.parse({
    verdict: "needs_approval",
    reasons: [
      `Cart total ($${cart.total.toFixed(2)}) is within Mandate limits, but exceeds auto-approve threshold ($${mandate.autoApproveBelow.toFixed(2)}). One-tap human approval required.`,
    ],
    ruleIds: ["RULE_REQUIRE_HUMAN_APPROVAL"],
    evaluatedAt: new Date().toISOString(),
  });
}

