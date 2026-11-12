import type { Cart } from '@/contracts/cart';
import type { Mandate } from '@/contracts/mandate';
import { type PolicyDecision, PolicyDecisionSchema } from '@/contracts/policy-decision';
import {
  type PolicyContext,
  type PolicyRule,
  ruleBlockedMerchants,
  ruleCategoryAllowList,
  ruleDeliveryDate,
  ruleMandateNotExpired,
  rulePayPalParity,
  rulePerPurchaseCap,
  rulePriceDrift,
  ruleSessionCap,
} from './rules';

/**
 * Standard ordered suite of pure deterministic policy rules.
 */
export const DEFAULT_POLICY_RULES: PolicyRule[] = [
  rulePerPurchaseCap,
  ruleSessionCap,
  ruleCategoryAllowList,
  ruleBlockedMerchants,
  ruleDeliveryDate,
  ruleMandateNotExpired,
  rulePriceDrift,
  rulePayPalParity,
];

/**
 * Evaluates a shopping Cart against a user-configured Mandate.
 *
 * Rules are deterministic pure functions (no I/O).
 * - If any rule fails: returns verdict 'deny' with reasons and ruleIds.
 * - If all rules pass and cart.total <= mandate.autoApproveBelow: returns 'allow'.
 * - Otherwise: returns 'needs_approval'.
 *
 * Note on Security: We NEVER trust cart.approved from an untrusted browser or agent caller.
 * The policy engine only evaluates whether the cart satisfies policy rules and whether
 * it qualifies for autonomous zero-click approval (<= autoApproveBelow) or requires human approval.
 */
export function evaluatePolicy(
  cart: Cart,
  mandate: Mandate,
  context?: PolicyContext
): PolicyDecision {
  const reasons: string[] = [];
  const ruleIds: string[] = [];
  const failedRules = [];

  for (const rule of DEFAULT_POLICY_RULES) {
    const result = rule(cart, mandate, context);
    if (!result.passed) {
      failedRules.push(result);
      reasons.push(result.reason);
      ruleIds.push(result.ruleId);
    }
  }

  const nowIso = new Date().toISOString();

  // Any violated rule -> DENY
  if (failedRules.length > 0) {
    return PolicyDecisionSchema.parse({
      verdict: 'deny',
      reasons,
      ruleIds,
      evaluatedAt: nowIso,
    });
  }

  // Check autonomous spending limit (autoApproveBelow)
  if (mandate.autoApproveBelow > 0 && cart.total <= mandate.autoApproveBelow + 0.001) {
    return PolicyDecisionSchema.parse({
      verdict: 'allow',
      reasons: [
        `Cart total ($${cart.total.toFixed(2)}) is within pre-authorized threshold ($${mandate.autoApproveBelow.toFixed(2)}). Zero-click autonomous approval granted.`,
      ],
      ruleIds: ['AUTO_APPROVED_WITHIN_MANDATE', 'RULE_AUTO_APPROVE_THRESHOLD'],
      evaluatedAt: nowIso,
    });
  }

  // Above autoApproveBelow: Human approval required
  return PolicyDecisionSchema.parse({
    verdict: 'needs_approval',
    reasons: [
      `Cart total ($${cart.total.toFixed(2)}) is within Mandate limits, but exceeds auto-approve threshold ($${mandate.autoApproveBelow.toFixed(2)}). One-tap human approval required.`,
    ],
    ruleIds: ['ABOVE_AUTO_APPROVE_THRESHOLD', 'RULE_REQUIRE_HUMAN_APPROVAL'],
    evaluatedAt: nowIso,
  });
}

/**
 * Single policy check exposed to Member B (AI Agent).
 * Allows the agent to inspect policy verdict without ability to initiate payment.
 */
export const checkPolicy = evaluatePolicy;
