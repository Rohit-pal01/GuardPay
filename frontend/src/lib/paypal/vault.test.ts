import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@/contracts/cart';
import type { Mandate } from '@/contracts/mandate';
import { getPayPalOrder } from './orders';
import {
  createPayPalSetupToken,
  executeAutonomousPayment,
  isEligibleForAutonomousPayment,
} from './vault';

const sampleMandate: Mandate = {
  id: 'mandate-test-vault',
  maxPerPurchase: 250,
  maxSessionTotal: 500,
  allowedCategories: ['electronics'],
  blockedMerchants: ['ShadyMerchant'],
  autoApproveBelow: 75,
  currency: 'USD',
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

const cheapCart: Cart = {
  id: 'cart-vault-cheap',
  mandateId: sampleMandate.id,
  sessionId: 'session-vault-test',
  items: [
    {
      candidateId: 'cand-usb-1',
      title: 'Fast Charger Cable',
      merchant: 'BestBuy',
      category: 'electronics',
      unitPrice: 25,
      quantity: 1,
      retailerUrl: 'https://bestbuy.com/cable',
      deliveryEstimated: false,
    },
  ],
  subtotal: 25,
  tax: 0,
  shipping: 0,
  total: 25,
  currency: 'USD',
  approved: false,
  createdAt: new Date().toISOString(),
  priceSnapshotAt: new Date().toISOString(),
};

const expensiveCart: Cart = {
  ...cheapCart,
  id: 'cart-vault-expensive',
  items: [
    {
      candidateId: 'cand-headphones-1',
      title: 'Noise Cancelling Headphones',
      merchant: 'BestBuy',
      category: 'electronics',
      unitPrice: 200,
      quantity: 1,
      retailerUrl: 'https://bestbuy.com/headphones',
      deliveryEstimated: false,
    },
  ],
  subtotal: 200,
  total: 200,
};

describe('Autonomous Mode & Vaulting Spike (Member A1)', () => {
  beforeEach(() => {
    vi.stubEnv('USE_MOCKS', 'true');
    vi.stubEnv('PAYPAL_ENV', 'sandbox');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('isEligibleForAutonomousPayment', () => {
    it('approves zero-click autonomous checkout when cart total is <= autoApproveBelow', () => {
      const eligibility = isEligibleForAutonomousPayment(cheapCart, sampleMandate);
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toContain('Zero-click autonomous settlement enabled');
    });

    it('requires human approval when cart total exceeds autoApproveBelow', () => {
      const eligibility = isEligibleForAutonomousPayment(expensiveCart, sampleMandate);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('One-tap human approval required');
    });

    it('denies autonomous payment when cart total exceeds maxPerPurchase', () => {
      const overLimitCart: Cart = {
        ...cheapCart,
        total: 300,
        subtotal: 300,
      };
      const eligibility = isEligibleForAutonomousPayment(overLimitCart, sampleMandate);
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('exceeds maximum per-purchase cap');
    });
  });

  describe('executeAutonomousPayment', () => {
    it('executes pre-authorized one-tap checkout without human dialog for eligible carts', async () => {
      const result = await executeAutonomousPayment({
        cart: cheapCart,
        mandate: sampleMandate,
      });

      expect(result.mode).toBe('pre_authorized_one_tap');
      expect(result.paypalOrderId).toMatch(/^PAYPAL-SBX-/);
      expect(result.order.amount).toBe(25);
      expect(result.order.status).toBe('CREATED');
    });

    it('throws a declined error when attempting autonomous execution on carts requiring approval', async () => {
      await expect(
        executeAutonomousPayment({
          cart: expensiveCart,
          mandate: sampleMandate,
        }),
      ).rejects.toMatchObject({
        name: 'PaypalError',
        code: 'declined',
      });
    });
  });

  describe('Vault Setup Tokens', () => {
    it('generates a mock setup token with approval URL in mock mode', async () => {
      const result = await createPayPalSetupToken({ customerId: 'cust-123' });
      expect(result.setupTokenId).toMatch(/^SET-/);
      expect(result.status).toBe('CREATED');
      expect(result.approvalUrl).toContain('sandbox.paypal.com');
    });
  });

  describe('getPayPalOrder', () => {
    it('returns a valid PaymentOrder in mock mode', async () => {
      const order = await getPayPalOrder('PAYPAL-SBX-12345');
      expect(order.paypalOrderId).toBe('PAYPAL-SBX-12345');
      expect(order.status).toBe('CREATED');
      expect(order.amount).toBe(25);
    });

    it('fetches and maps order from PayPal API in real sandbox mode', async () => {
      vi.stubEnv('USE_MOCKS', 'false');
      vi.stubEnv('PAYPAL_CLIENT_ID', 'test-client-id');
      vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-client-secret');

      const fetchMock = vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/v1/oauth2/token')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({ access_token: 'fake-token-123', expires_in: 3600 }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        if (url.includes('/v2/checkout/orders/PP-TEST-99')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'PP-TEST-99',
                status: 'COMPLETED',
                purchase_units: [
                  {
                    reference_id: 'cart-vault-cheap',
                    amount: {
                      value: '25.00',
                      currency_code: 'USD',
                      breakdown: {
                        item_total: { value: '25.00' },
                      },
                    },
                    payments: {
                      captures: [
                        {
                          id: 'CAP-TEST-99',
                          status: 'COMPLETED',
                          amount: { value: '25.00' },
                        },
                      ],
                    },
                  },
                ],
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } },
            ),
          );
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      vi.stubGlobal('fetch', fetchMock);

      const order = await getPayPalOrder('PP-TEST-99');
      expect(order.paypalOrderId).toBe('PP-TEST-99');
      expect(order.captureId).toBe('CAP-TEST-99');
      expect(order.status).toBe('COMPLETED');
      expect(order.amount).toBe(25);
    });
  });
});
