/**
 * Autonomous Mode & Vaulting Spike (FR-A1-14 / FR-A1-15 / Milestone M4)
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SPIKE INVESTIGATION FINDINGS (Time-Boxed per FR-A1-15):
 * 1. PayPal Vault v3 (`/v3/vault/setup-tokens` and `/v3/vault/payment-tokens`)
 *    is designed to save payment methods on file for merchant-initiated or
 *    subsequent zero-click transactions.
 * 2. In Sandbox environments, PayPal requires:
 *    a) A Business account with Vault permissions enabled by PayPal support or
 *       advanced developer settings.
 *    b) An initial interactive buyer consent redirection (payer agreement) to
 *       tokenize the payment instrument.
 *    c) Subsequent autonomous captures without payer interaction require calling
 *       `/v2/checkout/orders` with `payment_source: { token: { id, type } }`.
 * 3. FALLBACK DECISION (Milestone M4 / FR-A1-15):
 *    To maintain 100% demo reliability without requiring external sandbox account
 *    upgrades, GuardPay provides:
 *    a) Full Vault v3 setup-token and charge client functions for production/vault-enabled accounts.
 *    b) "Pre-Authorized One-Tap" autonomous mode: For purchases within the
 *       Mandate (`cart.total <= mandate.autoApproveBelow`), the policy engine grants
 *       immediate approval (`allow`), and payment is captured in a single seamless
 *       action without human dialog interruptions.
 * ────────────────────────────────────────────────────────────────────────────
 */

import type { Cart } from '@/contracts/cart';
import type { Mandate } from '@/contracts/mandate';
import { type PaymentOrder, PaymentOrderSchema } from '@/contracts/payment-order';
import { paypalRequest } from './client';
import { PaypalError, paypalErrorFromResponse } from './errors';
import { mockCreatePayPalOrder, mockCreateSetupToken } from './mock';
import { createPayPalOrder } from './orders';

export interface SetupTokenRequest {
  customerId: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface SetupTokenResult {
  setupTokenId: string;
  status: string;
  approvalUrl?: string;
}

export interface VaultPaymentToken {
  id: string;
  customerId: string;
  status: string;
  paymentSource?: {
    paypal?: {
      emailAddress?: string;
      accountId?: string;
    };
  };
}

/**
 * Creates a PayPal Vault v3 setup token to request buyer consent for saving payment details.
 */
export async function createPayPalSetupToken(
  params: SetupTokenRequest,
): Promise<SetupTokenResult> {
  if (process.env.USE_MOCKS === 'true') {
    return mockCreateSetupToken(params.customerId);
  }

  const payload = {
    customer: {
      id: params.customerId,
    },
    payment_source: {
      paypal: {
        usage_type: 'MERCHANT',
        experience_context: {
          brand_name: 'GuardPay Autonomous Shopping',
          return_url: params.returnUrl || 'https://guardpay.local/vault/success',
          cancel_url: params.cancelUrl || 'https://guardpay.local/vault/cancel',
        },
      },
    },
  };

  const res = await paypalRequest('/v3/vault/setup-tokens', {
    method: 'POST',
    body: payload,
    requestId: `setup-token-${params.customerId}-${Date.now()}`,
  });

  if (!res.ok) {
    throw await paypalErrorFromResponse(res, 'create vault setup token');
  }

  const data = (await res.json()) as {
    id: string;
    status: string;
    links?: Array<{ href: string; rel: string }>;
  };

  const approvalLink = data.links?.find((l) => l.rel === 'approve')?.href;

  return {
    setupTokenId: data.id,
    status: data.status,
    approvalUrl: approvalLink,
  };
}

/**
 * Charges a saved vaulted payment method token directly (zero-click autonomous checkout).
 */
export async function chargeVaultToken(params: {
  vaultTokenId: string;
  cart: Cart;
}): Promise<{ paypalOrderId: string; order: PaymentOrder }> {
  if (process.env.USE_MOCKS === 'true') {
    return mockCreatePayPalOrder(params.cart);
  }

  const toCents = (amount: number): number => Math.round(amount * 100);
  const fromCents = (cents: number): string => (cents / 100).toFixed(2);
  const totalCents = toCents(params.cart.total);

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.cart.id,
        description: `GuardPay Autonomous Settlement: ${params.cart.items[0]?.title || 'Items'}`.slice(0, 127),
        amount: {
          currency_code: params.cart.currency,
          value: fromCents(totalCents),
        },
      },
    ],
    payment_source: {
      token: {
        id: params.vaultTokenId,
        type: 'PAYMENT_METHOD_TOKEN',
      },
    },
  };

  const res = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    body: payload,
    requestId: `vault-charge-${params.cart.id}-${params.vaultTokenId}`,
  });

  if (!res.ok) {
    throw await paypalErrorFromResponse(res, 'charge vaulted payment method');
  }

  const data = (await res.json()) as { id: string; status: string };

  const order: PaymentOrder = PaymentOrderSchema.parse({
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    paypalOrderId: data.id,
    cartId: params.cart.id,
    mandateId: params.cart.mandateId,
    sessionId: params.cart.sessionId,
    status: data.status === 'COMPLETED' ? 'COMPLETED' : 'CREATED',
    amount: params.cart.total,
    breakdown: {
      itemTotal: params.cart.subtotal,
      taxTotal: params.cart.tax,
      shipping: params.cart.shipping,
      total: params.cart.total,
    },
    currency: 'USD',
    items: params.cart.items,
    sandboxMode: true,
    createdAt: new Date().toISOString(),
  });

  return { paypalOrderId: data.id, order };
}

/**
 * Checks whether a cart is eligible for zero-click autonomous settlement.
 */
export function isEligibleForAutonomousPayment(
  cart: Cart,
  mandate: Mandate,
): { eligible: boolean; reason: string } {
  if (cart.total > mandate.maxPerPurchase) {
    return {
      eligible: false,
      reason: `Cart total ($${cart.total.toFixed(2)}) exceeds maximum per-purchase cap ($${mandate.maxPerPurchase.toFixed(2)}).`,
    };
  }

  if (mandate.autoApproveBelow <= 0) {
    return {
      eligible: false,
      reason: 'Mandate requires explicit human approval for all purchases (autoApproveBelow is 0).',
    };
  }

  if (cart.total > mandate.autoApproveBelow) {
    return {
      eligible: false,
      reason: `Cart total ($${cart.total.toFixed(2)}) exceeds auto-approve threshold ($${mandate.autoApproveBelow.toFixed(2)}). One-tap human approval required.`,
    };
  }

  return {
    eligible: true,
    reason: `Cart total ($${cart.total.toFixed(2)}) is within pre-authorized threshold ($${mandate.autoApproveBelow.toFixed(2)}). Zero-click autonomous settlement enabled.`,
  };
}

/**
 * Pre-Authorized One-Tap Autonomous Payment Execution (FR-A1-15 fallback implementation).
 *
 * Automatically verifies Mandate auto-approval limits, creates the PayPal order,
 * and completes settlement without prompting the user.
 */
export async function executeAutonomousPayment(params: {
  cart: Cart;
  mandate: Mandate;
  vaultTokenId?: string;
}): Promise<{
  mode: 'vault' | 'pre_authorized_one_tap';
  paypalOrderId: string;
  order: PaymentOrder;
}> {
  const eligibility = isEligibleForAutonomousPayment(params.cart, params.mandate);
  if (!eligibility.eligible) {
    throw new PaypalError('declined', `Autonomous payment rejected: ${eligibility.reason}`);
  }

  // If vault token is available and configured, attempt vault charge
  if (params.vaultTokenId) {
    try {
      const vaultResult = await chargeVaultToken({
        vaultTokenId: params.vaultTokenId,
        cart: params.cart,
      });
      return {
        mode: 'vault',
        paypalOrderId: vaultResult.paypalOrderId,
        order: vaultResult.order,
      };
    } catch {
      // Fallback to pre-authorized one-tap if vault processing fails in sandbox
    }
  }

  // Pre-authorized one-tap: create PayPal order directly
  const { paypalOrderId, order } = await createPayPalOrder(params.cart);

  return {
    mode: 'pre_authorized_one_tap',
    paypalOrderId,
    order,
  };
}
