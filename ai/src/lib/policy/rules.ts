import { Cart } from "@/contracts/cart.js";
import { Mandate } from "@/contracts/mandate.js";

export interface PolicyRuleResult {
  ruleId: string;
  passed: boolean;
  reason: string;
  isFatal?: boolean; // If fatal and fails, result is 'deny'
}

export type PolicyRule = (cart: Cart, mandate: Mandate, context?: PolicyContext) => PolicyRuleResult;

export interface PolicyContext {
  sessionSpentTotal?: number;
  paypalOrderAmount?: number;
  originalCartTotal?: number;
}

/**
 * Rule 1: Per-purchase cap
 */
export const rulePerPurchaseCap: PolicyRule = (cart, mandate) => {
  const passed = cart.total <= mandate.maxPerPurchase;
  return {
    ruleId: "RULE_PER_PURCHASE_CAP",
    passed,
    reason: passed
      ? `Cart total ($${cart.total.toFixed(2)}) is within the $${mandate.maxPerPurchase.toFixed(2)} purchase limit.`
      : `Cart total ($${cart.total.toFixed(2)}) exceeds maximum per-purchase limit of $${mandate.maxPerPurchase.toFixed(2)}.`,
    isFatal: true,
  };
};

/**
 * Rule 2: Session spending cap
 */
export const ruleSessionCap: PolicyRule = (cart, mandate, context) => {
  const currentSpent = context?.sessionSpentTotal ?? 0;
  const projectedTotal = currentSpent + cart.total;
  const passed = projectedTotal <= mandate.maxSessionTotal;

  return {
    ruleId: "RULE_SESSION_CAP",
    passed,
    reason: passed
      ? `Projected session spend ($${projectedTotal.toFixed(2)}) is within session cap of $${mandate.maxSessionTotal.toFixed(2)}.`
      : `Projected session spend ($${projectedTotal.toFixed(2)}) exceeds session cap of $${mandate.maxSessionTotal.toFixed(2)}.`,
    isFatal: true,
  };
};

/**
 * Rule 3: Category allow-list
 */
export const ruleCategoryAllowList: PolicyRule = (cart, mandate) => {
  if (!mandate.allowedCategories || mandate.allowedCategories.length === 0) {
    return { ruleId: "RULE_CATEGORY_ALLOWLIST", passed: true, reason: "No category restrictions configured." };
  }

  const allowedSet = new Set(mandate.allowedCategories.map((c) => c.toLowerCase()));
  const unauthorizedItems = cart.items.filter((item) => !allowedSet.has(item.category.toLowerCase()));

  const passed = unauthorizedItems.length === 0;
  return {
    ruleId: "RULE_CATEGORY_ALLOWLIST",
    passed,
    reason: passed
      ? "All items belong to allowed categories."
      : `Items belong to unauthorized categories: ${unauthorizedItems.map((i) => `'${i.category}'`).join(", ")}.`,
    isFatal: true,
  };
};

/**
 * Rule 4: Blocked merchants
 */
export const ruleBlockedMerchants: PolicyRule = (cart, mandate) => {
  if (!mandate.blockedMerchants || mandate.blockedMerchants.length === 0) {
    return { ruleId: "RULE_BLOCKED_MERCHANTS", passed: true, reason: "No blocked merchants configured." };
  }

  const blockedSet = new Set(mandate.blockedMerchants.map((m) => m.toLowerCase()));
  const prohibitedItems = cart.items.filter((item) => blockedSet.has(item.merchant.toLowerCase()));

  const passed = prohibitedItems.length === 0;
  return {
    ruleId: "RULE_BLOCKED_MERCHANTS",
    passed,
    reason: passed
      ? "No items from blocked merchants."
      : `Contains items from blocked merchant(s): ${prohibitedItems.map((i) => `'${i.merchant}'`).join(", ")}.`,
    isFatal: true,
  };
};

/**
 * Rule 5: Mandate expiration check
 */
export const ruleMandateNotExpired: PolicyRule = (cart, mandate) => {
  const expires = new Date(mandate.expiresAt).getTime();
  const now = Date.now();
  const passed = now <= expires;

  return {
    ruleId: "RULE_MANDATE_EXPIRATION",
    passed,
    reason: passed
      ? `Mandate is active (expires on ${new Date(mandate.expiresAt).toLocaleDateString()}).`
      : `Mandate expired on ${new Date(mandate.expiresAt).toLocaleDateString()}.`,
    isFatal: true,
  };
};

/**
 * Rule 6: Capture-time price drift check
 */
export const rulePriceDrift: PolicyRule = (cart, mandate, context) => {
  if (context?.originalCartTotal === undefined) {
    return { ruleId: "RULE_PRICE_DRIFT", passed: true, reason: "No previous cart price recorded." };
  }

  const passed = Math.abs(cart.total - context.originalCartTotal) < 0.01;
  return {
    ruleId: "RULE_PRICE_DRIFT",
    passed,
    reason: passed
      ? "Cart price has not drifted since draft creation."
      : `Price drifted from $${context.originalCartTotal.toFixed(2)} to $${cart.total.toFixed(2)}.`,
    isFatal: true,
  };
};

/**
 * Rule 7: PayPal amount parity check
 */
export const rulePayPalParity: PolicyRule = (cart, mandate, context) => {
  if (context?.paypalOrderAmount === undefined) {
    return { ruleId: "RULE_PAYPAL_PARITY", passed: true, reason: "PayPal amount check deferred until checkout." };
  }

  const passed = Math.abs(cart.total - context.paypalOrderAmount) < 0.01;
  return {
    ruleId: "RULE_PAYPAL_PARITY",
    passed,
    reason: passed
      ? "PayPal order amount matches cart total exactly."
      : `Security mismatch: PayPal charge ($${context.paypalOrderAmount.toFixed(2)}) differs from cart total ($${cart.total.toFixed(2)}).`,
    isFatal: true,
  };
};

