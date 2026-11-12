import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@/contracts/cart';
import { capturePayPalOrder } from './capture';
import { createPayPalOrder } from './orders';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Fake PayPal: the token request always works, every other call returns apiResponse().
function mockPayPal(apiResponse: () => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
    String(input).includes('/v1/oauth2/token')
      ? jsonResponse(200, { access_token: 'test-token', expires_in: 3600 })
      : apiResponse(),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const cart: Cart = {
  id: 'cart-paypal-test',
  mandateId: 'mandate-paypal-test',
  sessionId: 'session-paypal-test',
  items: [
    {
      candidateId: 'cand-1',
      title: 'Test item',
      merchant: 'Test Shop',
      category: 'electronics',
      unitPrice: 10,
      quantity: 1,
      retailerUrl: 'https://example.com/item',
      deliveryEstimated: false,
    },
  ],
  subtotal: 10,
  tax: 0,
  shipping: 0,
  total: 10,
  currency: 'USD',
  approved: false,
  createdAt: '2026-11-12T00:00:00.000Z',
  priceSnapshotAt: '2026-11-12T00:00:00.000Z',
};

describe('PayPal flow (real mode, fake PayPal)', () => {
  beforeEach(() => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('PAYPAL_ENV', 'sandbox');
    vi.stubEnv('PAYPAL_CLIENT_ID', 'test-id');
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'test-secret');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('raises an error when PayPal rejects the order instead of returning a fake order', async () => {
    mockPayPal(() =>
      jsonResponse(422, {
        name: 'UNPROCESSABLE_ENTITY',
        details: [{ issue: 'INSTRUMENT_DECLINED' }],
      }),
    );
    await expect(createPayPalOrder(cart)).rejects.toMatchObject({
      name: 'PaypalError',
      code: 'declined',
    });
  });

  it('refuses a cart whose total does not match its items, without calling PayPal', async () => {
    const fetchMock = mockPayPal(() => jsonResponse(201, { id: 'PP-1' }));
    await expect(createPayPalOrder({ ...cart, total: 11 })).rejects.toMatchObject({
      name: 'PaypalError',
      code: 'unknown',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a COMPLETED order with the real capture id when PayPal confirms', async () => {
    mockPayPal(() =>
      jsonResponse(201, {
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: 'CAP-1',
                  status: 'COMPLETED',
                  amount: { value: '10.00', currency_code: 'USD' },
                },
              ],
            },
          },
        ],
      }),
    );
    const order = await capturePayPalOrder('PP-1', cart);
    expect(order.status).toBe('COMPLETED');
    expect(order.captureId).toBe('CAP-1');
  });

  it('never invents a capture id when PayPal did not complete the payment', async () => {
    mockPayPal(() => jsonResponse(201, { status: 'PAYER_ACTION_REQUIRED' }));
    await expect(capturePayPalOrder('PP-1', cart)).rejects.toMatchObject({
      name: 'PaypalError',
      code: 'declined',
    });
  });

  it('reports a second capture on the same order as duplicate_capture', async () => {
    mockPayPal(() =>
      jsonResponse(422, {
        name: 'UNPROCESSABLE_ENTITY',
        details: [{ issue: 'ORDER_ALREADY_CAPTURED' }],
      }),
    );
    await expect(capturePayPalOrder('PP-1', cart)).rejects.toMatchObject({
      code: 'duplicate_capture',
    });
  });

  it('rejects a capture whose paid amount differs from the cart total', async () => {
    mockPayPal(() =>
      jsonResponse(201, {
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: 'CAP-2',
                  status: 'COMPLETED',
                  amount: { value: '5.00', currency_code: 'USD' },
                },
              ],
            },
          },
        ],
      }),
    );
    await expect(capturePayPalOrder('PP-2', cart)).rejects.toMatchObject({
      code: 'unknown',
    });
  });
});
