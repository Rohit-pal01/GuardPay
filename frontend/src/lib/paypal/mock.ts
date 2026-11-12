import type { Cart } from '@/contracts/cart';
import { type PaymentOrder, PaymentOrderSchema } from '@/contracts/payment-order';

export function mockCreatePayPalOrder(cart: Cart): { paypalOrderId: string; order: PaymentOrder } {
  const paypalOrderId = `PAYPAL-SBX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const order: PaymentOrder = PaymentOrderSchema.parse({
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    paypalOrderId,
    cartId: cart.id,
    mandateId: cart.mandateId,
    sessionId: cart.sessionId,
    status: 'CREATED',
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
    createdAt: new Date().toISOString(),
  });

  return { paypalOrderId, order };
}

export function mockCapturePayPalOrder(paypalOrderId: string, cart: Cart): PaymentOrder {
  const captureId = `CAP-SBX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
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
}
