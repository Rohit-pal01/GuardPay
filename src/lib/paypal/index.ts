import { Cart } from "@/contracts/cart.js";
import { PaymentOrder } from "@/contracts/payment-order.js";

/**
 * PayPal API stub for Person A
 */
export async function createPayPalOrder(cart: Cart): Promise<{ paypalOrderId: string }> {
  return {
    paypalOrderId: `MOCK_PAYPAL_ORDER_${Date.now()}`,
  };
}

export async function capturePayPalOrder(paypalOrderId: string, cart: Cart): Promise<PaymentOrder> {
  return {
    id: `order_${Date.now()}`,
    cartId: cart.id,
    mandateId: cart.mandateId,
    paypalOrderId,
    captureId: `CAPTURE_${Date.now()}`,
    amount: cart.total,
    currency: "USD",
    status: "captured",
    createdAt: new Date().toISOString(),
    capturedAt: new Date().toISOString(),
  };
}

