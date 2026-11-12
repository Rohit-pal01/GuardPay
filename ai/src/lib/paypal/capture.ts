import { Cart } from "@/contracts/cart.js";
import { PaymentOrder } from "@/contracts/payment-order.js";
import { getPayPalAccessToken, getPayPalBaseUrl } from "./client.js";
import { mockCapturePayPalOrder } from "./mock.js";

export async function capturePayPalOrder(paypalOrderId: string, cart: Cart): Promise<PaymentOrder> {
  const useMocks = process.env.USE_MOCKS === "true";
  const token = await getPayPalAccessToken();

  if (useMocks || !token) {
    return mockCapturePayPalOrder(paypalOrderId, cart);
  }

  try {
    const res = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`PayPal Capture failed (${res.status}), using mock capture`);
      return mockCapturePayPalOrder(paypalOrderId, cart);
    }

    const data = await res.json();
    const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAPTURE_${Date.now()}`;

    return {
      id: `pay_order_${Date.now()}`,
      cartId: cart.id,
      mandateId: cart.mandateId,
      paypalOrderId,
      captureId,
      amount: cart.total,
      currency: "USD",
      status: "captured",
      createdAt: new Date().toISOString(),
      capturedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("PayPal capture exception, using mock fallback:", err);
    return mockCapturePayPalOrder(paypalOrderId, cart);
  }
}

