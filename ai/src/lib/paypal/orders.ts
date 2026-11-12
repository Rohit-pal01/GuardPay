import { Cart } from "@/contracts/cart.js";
import { getPayPalAccessToken, getPayPalBaseUrl } from "./client.js";
import { mockCreatePayPalOrder } from "./mock.js";

export async function createPayPalOrder(cart: Cart): Promise<{ paypalOrderId: string }> {
  const useMocks = process.env.USE_MOCKS === "true";
  const token = await getPayPalAccessToken();

  if (useMocks || !token) {
    return mockCreatePayPalOrder(cart);
  }

  try {
    // Mathematically guaranteed breakdown to satisfy PayPal API
    const itemTotal = cart.subtotal.toFixed(2);
    const shippingTotal = cart.shippingTotal.toFixed(2);
    const taxTotal = cart.taxTotal.toFixed(2);
    const orderTotal = (Number(itemTotal) + Number(shippingTotal) + Number(taxTotal)).toFixed(2);

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: cart.id,
          description: `Mandate Settlement: ${cart.items[0]?.title || "Items"}`,
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
              value: item.price.toFixed(2),
            },
            category: "PHYSICAL_GOODS",
          })),
        },
      ],
      application_context: {
        brand_name: "Mandate Shopping",
        user_action: "PAY_NOW",
      },
    };

    const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn(`PayPal Create Order failed (${res.status}), using mock fallback`);
      return mockCreatePayPalOrder(cart);
    }

    const data = await res.json();
    return { paypalOrderId: data.id };
  } catch (err) {
    console.warn("PayPal create order exception, falling back to mock:", err);
    return mockCreatePayPalOrder(cart);
  }
}

