import type { Cart } from '@/contracts/cart';
import { type PaymentOrder, PaymentOrderSchema } from '@/contracts/payment-order';
import { getPayPalAccessToken, getPayPalBaseUrl } from './client';
import { mockCreatePayPalOrder } from './mock';

export async function createPayPalOrder(cart: Cart): Promise<{ paypalOrderId: string; order: PaymentOrder }> {
  const useMocks = process.env.USE_MOCKS === 'true';
  const token = await getPayPalAccessToken();

  if (useMocks || !token) {
    return mockCreatePayPalOrder(cart);
  }

  try {
    const itemTotal = cart.subtotal.toFixed(2);
    const shippingTotal = cart.shipping.toFixed(2);
    const taxTotal = cart.tax.toFixed(2);
    const orderTotal = (Number(itemTotal) + Number(shippingTotal) + Number(taxTotal)).toFixed(2);

    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: cart.id,
          description: `Mandate Settlement: ${cart.items[0]?.title || 'Items'}`,
          amount: {
            currency_code: cart.currency,
            value: orderTotal,
            breakdown: {
              item_total: { currency_code: cart.currency, value: itemTotal },
              shipping: { currency_code: cart.currency, value: shippingTotal },
              tax_total: { currency_code: cart.currency, value: taxTotal },
            },
          },
          items: cart.items.map((item) => ({
            name: item.title.substring(0, 127),
            quantity: String(item.quantity),
            unit_amount: {
              currency_code: cart.currency,
              value: item.unitPrice.toFixed(2),
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

    const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      return mockCreatePayPalOrder(cart);
    }

    const data = (await res.json()) as { id: string };
    const order: PaymentOrder = PaymentOrderSchema.parse({
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      paypalOrderId: data.id,
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

    return { paypalOrderId: data.id, order };
  } catch {
    return mockCreatePayPalOrder(cart);
  }
}
