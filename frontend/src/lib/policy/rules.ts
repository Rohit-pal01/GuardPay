import type { Cart } from '@/contracts/cart';
import type { Mandate } from '@/contracts/mandate';

export interface PolicyRuleResult {
  ruleId: string;
  passed: boolean;
  reason: string;
  isFatal?: boolean;
}

export interface PolicyContext {
  sessionSpentTotal?: number;
  paypalOrderAmount?: number;
  originalCartTotal?: number;
}

export type PolicyRule = (cart: Cart, mandate: Mandate, context?: PolicyContext) => PolicyRuleResult;

/**
 * FR-A2-8: Per-purchase cap
 * Validates cart total is positive and does not exceed mandate.maxPerPurchase.
 */
export const rulePerPurchaseCap: PolicyRule = (cart, mandate) => {
  if (cart.total <= 0) {
    return {
      ruleId: 'PER_PURCHASE_CAP_EXCEEDED',
      passed: false,
      reason: `Cart total must be greater than zero. Received: $${cart.total.toFixed(2)}.`,
      isFatal: true,
    };
  }

  const passed = cart.total <= mandate.maxPerPurchase + 0.001;
  return {
    ruleId: 'PER_PURCHASE_CAP_EXCEEDED',
    passed,
    reason: passed
      ? `Cart total ($${cart.total.toFixed(2)}) is within the $${mandate.maxPerPurchase.toFixed(2)} purchase limit.`
      : `Cart total ($${cart.total.toFixed(2)}) exceeds maximum per-purchase limit of $${mandate.maxPerPurchase.toFixed(2)}.`,
    isFatal: true,
  };
};

/**
 * FR-A2-9: Session spending cap
 * Validates projected session spend does not exceed mandate.maxSessionTotal.
 */
export const ruleSessionCap: PolicyRule = (cart, mandate, context) => {
  const currentSpent = context?.sessionSpentTotal ?? 0;
  const projectedTotal = currentSpent + cart.total;
  const passed = projectedTotal <= mandate.maxSessionTotal + 0.001;

  return {
    ruleId: 'SESSION_CAP_EXCEEDED',
    passed,
    reason: passed
      ? `Projected session spend ($${projectedTotal.toFixed(2)}) is within session cap of $${mandate.maxSessionTotal.toFixed(2)}.`
      : `Projected session spend ($${projectedTotal.toFixed(2)}) exceeds session cap of $${mandate.maxSessionTotal.toFixed(2)}.`,
    isFatal: true,
  };
};

/**
 * FR-A2-10: Category allow-list
 * Ensures all cart items belong to allowed categories.
 */
export const ruleCategoryAllowList: PolicyRule = (cart, mandate) => {
  if (!mandate.allowedCategories || mandate.allowedCategories.length === 0) {
    return {
      ruleId: 'CATEGORY_NOT_ALLOWED',
      passed: true,
      reason: 'No category restrictions configured.',
    };
  }

  const allowedSet = new Set(mandate.allowedCategories.map((c) => c.toLowerCase().trim()));
  const unauthorized = cart.items.filter((item) => !allowedSet.has(item.category.toLowerCase().trim()));

  const passed = unauthorized.length === 0;
  return {
    ruleId: 'CATEGORY_NOT_ALLOWED',
    passed,
    reason: passed
      ? 'All items belong to allowed categories.'
      : `Items belong to unauthorized categories: ${unauthorized.map((i) => `'${i.category}'`).join(', ')}.`,
    isFatal: true,
  };
};

/**
 * FR-A2-11: Blocked merchants
 * Blocks items from prohibited or untrusted vendors.
 */
export const ruleBlockedMerchants: PolicyRule = (cart, mandate) => {
  if (!mandate.blockedMerchants || mandate.blockedMerchants.length === 0) {
    return {
      ruleId: 'MERCHANT_BLOCKED',
      passed: true,
      reason: 'No blocked merchants configured.',
    };
  }

  const blockedSet = new Set(mandate.blockedMerchants.map((m) => m.toLowerCase().trim()));
  const prohibited = cart.items.filter((item) => blockedSet.has(item.merchant.toLowerCase().trim()));

  const passed = prohibited.length === 0;
  return {
    ruleId: 'MERCHANT_BLOCKED',
    passed,
    reason: passed
      ? 'No items from blocked merchants.'
      : `Contains items from blocked merchant(s): ${prohibited.map((i) => `'${i.merchant}'`).join(', ')}.`,
    isFatal: true,
  };
};

/**
 * FR-A2-12: Delivery date deadline
 * When mandate.deliverBy is set, ensure delivery estimates do not miss the deadline.
 */
export const ruleDeliveryDate: PolicyRule = (cart, mandate) => {
  if (!mandate.deliverBy) {
    return {
      ruleId: 'DELIVERY_AFTER_DEADLINE',
      passed: true,
      reason: 'No delivery deadline configured.',
    };
  }

  const deadline = new Date(mandate.deliverBy);
  if (Number.isNaN(deadline.getTime())) {
    return {
      ruleId: 'DELIVERY_AFTER_DEADLINE',
      passed: false,
      reason: `Mandate deliverBy date cannot be read (${mandate.deliverBy}).`,
      isFatal: true,
    };
  }

  for (const item of cart.items) {
    if (item.deliveryEstimate && !item.deliveryEstimated) {
      const est = new Date(item.deliveryEstimate);
      if (!Number.isNaN(est.getTime()) && est > deadline) {
        return {
          ruleId: 'DELIVERY_AFTER_DEADLINE',
          passed: false,
          reason: `Estimated delivery (${item.deliveryEstimate}) misses your ${mandate.deliverBy} deadline.`,
          isFatal: true,
        };
      }
    }
  }

  return {
    ruleId: 'DELIVERY_AFTER_DEADLINE',
    passed: true,
    reason: `All confirmed deliveries are scheduled on or before ${mandate.deliverBy}.`,
  };
};

/**
 * FR-A2-13: Mandate not expired
 * Dates like expiresAt are plain text now.
 * If a date cannot be read, treat the mandate as expired and deny.
 */
export const ruleMandateNotExpired: PolicyRule = (_cart, mandate) => {
  if (!mandate.expiresAt || typeof mandate.expiresAt !== 'string' || mandate.expiresAt.trim() === '') {
    return {
      ruleId: 'MANDATE_EXPIRED',
      passed: false,
      reason: 'Mandate expiration date is missing or unreadable.',
      isFatal: true,
    };
  }

  const expiresTime = new Date(mandate.expiresAt).getTime();
  if (Number.isNaN(expiresTime)) {
    return {
      ruleId: 'MANDATE_EXPIRED',
      passed: false,
      reason: `Mandate expiration date cannot be read (${mandate.expiresAt}). Treating mandate as expired.`,
      isFatal: true,
    };
  }

  const now = Date.now();
  const passed = expiresTime > now;

  return {
    ruleId: 'MANDATE_EXPIRED',
    passed,
    reason: passed
      ? `Mandate is active (expires on ${mandate.expiresAt}).`
      : `Mandate expired on ${mandate.expiresAt}.`,
    isFatal: true,
  };
};

/**
 * FR-A2-14: Capture-time price drift check
 * Re-checks price at capture time; blocks if price changed since cart creation.
 */
export const rulePriceDrift: PolicyRule = (cart, _mandate, context) => {
  if (context?.originalCartTotal === undefined) {
    return {
      ruleId: 'PRICE_DRIFT_DETECTED',
      passed: true,
      reason: 'No baseline price recorded for drift verification.',
    };
  }

  const passed = Math.abs(cart.total - context.originalCartTotal) < 0.01;
  return {
    ruleId: 'PRICE_DRIFT_DETECTED',
    passed,
    reason: passed
      ? 'Cart price has not drifted since draft creation.'
      : `Price drifted from $${context.originalCartTotal.toFixed(2)} to $${cart.total.toFixed(2)}.`,
    isFatal: true,
  };
};

/**
 * FR-A2-15: PayPal amount parity check
 * Verifies PayPal charge matches cart total exactly.
 */
export const rulePayPalParity: PolicyRule = (cart, _mandate, context) => {
  if (context?.paypalOrderAmount === undefined) {
    return {
      ruleId: 'PAYPAL_AMOUNT_MISMATCH',
      passed: true,
      reason: 'PayPal charge check deferred until payment processing.',
    };
  }

  const passed = Math.abs(cart.total - context.paypalOrderAmount) < 0.01;
  return {
    ruleId: 'PAYPAL_AMOUNT_MISMATCH',
    passed,
    reason: passed
      ? 'PayPal order amount matches cart total exactly.'
      : `Security mismatch: PayPal charge ($${context.paypalOrderAmount.toFixed(2)}) differs from cart total ($${cart.total.toFixed(2)}).`,
    isFatal: true,
  };
};
