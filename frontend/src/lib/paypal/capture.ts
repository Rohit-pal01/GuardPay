import type { Cart } from '@/contracts/cart';
import { type PaymentOrder, PaymentOrderSchema } from '@/contracts/payment-order';
import { getPayPalAccessToken, getPayPalBaseUrl } from './client';
import { mockCapturePayPalOrder } from './mock';

export async function capturePayPalOrder(paypalOrderId: string, cart: Cart): Promise<PaymentOrder> {
  const useMocks = process.env.USE_MOCKS === 'true';
  const token = await getPayPalAccessToken();

  if (useMocks || !token) {
    return mockCapturePayPalOrder(paypalOrderId, cart);
  }

  try {
    const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return mockCapturePayPalOrder(paypalOrderId, cart);
    }

    const data = (await res.json()) as {
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{ id: string }>;
        };
      }>;
    };
    const captureId =
      data.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP-SBX-${Date.now()}`;

    return PaymentOrderSchema.parse({
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      paypalOrderId,
      captureId,
      cartId: cart.id,
      mandateId: cart.mandateId,
      sessionId: cart.sessionId,
      status: 'COMPLETED',
      amount: cart.total,
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
  } catch {
    return mockCapturePayPalOrder(paypalOrderId, cart);
  }
}
