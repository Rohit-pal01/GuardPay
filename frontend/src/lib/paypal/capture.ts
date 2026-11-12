import type { Cart } from '@/contracts/cart';
import { type PaymentOrder, PaymentOrderSchema } from '@/contracts/payment-order';
import { paypalRequest } from './client';
import { PaypalError, paypalErrorFromResponse } from './errors';
import { mockCapturePayPalOrder } from './mock';

export async function capturePayPalOrder(
  paypalOrderId: string,
  cart: Cart,
): Promise<PaymentOrder> {
  // The mock runs ONLY when USE_MOCKS=true. A real failure is never hidden.
  if (process.env.USE_MOCKS === 'true') {
    return mockCapturePayPalOrder(paypalOrderId, cart);
  }

  const res = await paypalRequest(
    `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: 'POST',
      body: {},
      requestId: `capture-${paypalOrderId}`,
    },
  );

  if (!res.ok) {
    throw await paypalErrorFromResponse(res, 'capture the payment');
  }

  const data = (await res.json()) as {
    status?: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id?: string;
          status?: string;
          amount?: { value?: string; currency_code?: string };
        }>;
      };
    }>;
  };

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];

  // Trust PayPal's reply, not our own cart: no capture id means no payment.
  if (data.status !== 'COMPLETED' || !capture?.id) {
    throw new PaypalError(
      'declined',
      `PayPal did not complete the payment (status: ${data.status ?? 'unknown'})`,
    );
  }
  if (capture.status && capture.status !== 'COMPLETED') {
    throw new PaypalError(
      'unknown',
      `Capture ${capture.id} is ${capture.status}, not COMPLETED`,
    );
  }

  const paidCents = Math.round(Number(capture.amount?.value) * 100);
  if (
    !Number.isFinite(paidCents) ||
    paidCents !== Math.round(cart.total * 100) ||
    capture.amount?.currency_code !== 'USD'
  ) {
    throw new PaypalError(
      'unknown',
      `Captured amount differs from the cart total. Check PayPal for capture ${capture.id}`,
    );
  }

  return PaymentOrderSchema.parse({
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    paypalOrderId,
    captureId: capture.id,
    cartId: cart.id,
    mandateId: cart.mandateId,
    sessionId: cart.sessionId,
    status: 'COMPLETED',
    amount: paidCents / 100,
    breakdown: {
      itemTotal: cart.subtotal,
      taxTotal: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
    },
    currency: 'USD',
    items: cart.items,
    sandboxMode: true,
    createdAt: cart.createdAt || new Date().toISOString(),
    capturedAt: new Date().toISOString(),
  });
}
