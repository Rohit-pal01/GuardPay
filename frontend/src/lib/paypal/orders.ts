import type { Cart } from '@/contracts/cart';
import { type PaymentOrder, PaymentOrderSchema } from '@/contracts/payment-order';
import { paypalRequest } from './client';
import { PaypalError, paypalErrorFromResponse } from './errors';
import { mockCreatePayPalOrder } from './mock';

// Money is added up in whole cents so the totals always match exactly.
const toCents = (amount: number): number => Math.round(amount * 100);
const fromCents = (cents: number): string => (cents / 100).toFixed(2);

export async function createPayPalOrder(
  cart: Cart,
): Promise<{ paypalOrderId: string; order: PaymentOrder }> {
  // The mock runs ONLY when USE_MOCKS=true. A real failure is never hidden.
  if (process.env.USE_MOCKS === 'true') {
    return mockCreatePayPalOrder(cart);
  }

  const itemCents = cart.items.reduce(
    (sum, item) => sum + toCents(item.unitPrice) * item.quantity,
    0,
  );
  const shippingCents = toCents(cart.shipping);
  const taxCents = toCents(cart.tax);
  const totalCents = itemCents + shippingCents + taxCents;

  if (totalCents <= 0) {
    throw new PaypalError('unknown', 'Cart total must be greater than zero');
  }
  if (totalCents !== toCents(cart.total)) {
    throw new PaypalError(
      'unknown',
      `Cart total ${cart.total} does not match its items, shipping and tax (${fromCents(totalCents)})`,
    );
  }

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: cart.id,
        description: `Mandate Settlement: ${cart.items[0]?.title || 'Items'}`.substring(0, 127),
        amount: {
          currency_code: cart.currency,
          value: fromCents(totalCents),
          breakdown: {
            item_total: { currency_code: cart.currency, value: fromCents(itemCents) },
            shipping: { currency_code: cart.currency, value: fromCents(shippingCents) },
            tax_total: { currency_code: cart.currency, value: fromCents(taxCents) },
          },
        },
        items: cart.items.map((item) => ({
          name: item.title.substring(0, 127),
          quantity: String(item.quantity),
          unit_amount: {
            currency_code: cart.currency,
            value: fromCents(toCents(item.unitPrice)),
          },
          category: 'PHYSICAL_GOODS',
        })),
      },
    ],
    application_context: {
      brand_name: 'GaurdPay Mandate Shopping',
      user_action: 'PAY_NOW',
    },
  };

  const res = await paypalRequest('/v2/checkout/orders', {
    method: 'POST',
    body: payload,
    requestId: `create-${cart.id}-${fromCents(totalCents)}`,
  });

  if (!res.ok) {
    throw await paypalErrorFromResponse(res, 'create the order');
  }

  const data = (await res.json()) as { id?: string };
  if (!data.id) {
    throw new PaypalError('unknown', 'PayPal did not return an order id');
  }

  const order: PaymentOrder = PaymentOrderSchema.parse({
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    paypalOrderId: data.id,
    cartId: cart.id,
    mandateId: cart.mandateId,
    sessionId: cart.sessionId,
    status: 'CREATED',
    amount: totalCents / 100,
    breakdown: {
      itemTotal: itemCents / 100,
      taxTotal: taxCents / 100,
      shipping: shippingCents / 100,
      total: totalCents / 100,
    },
    currency: 'USD',
    items: cart.items,
    sandboxMode: true,
    createdAt: new Date().toISOString(),
  });

  return { paypalOrderId: data.id, order };
}
