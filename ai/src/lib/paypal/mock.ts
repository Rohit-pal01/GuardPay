import { Cart } from "@/contracts/cart.js";
import { PaymentOrder, PaymentOrderSchema } from "@/contracts/payment-order.js";

const mockOrders = new Map<string, { cart: Cart; status: string; captureId?: string }>();

export function mockCreatePayPalOrder(cart: Cart): { paypalOrderId: string } {
  const paypalOrderId = `SANDBOX_ORDER_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
  mockOrders.set(paypalOrderId, {
    cart,
    status: "CREATED",
  });
  return { paypalOrderId };
}

export function mockCapturePayPalOrder(paypalOrderId: string, cart: Cart): PaymentOrder {
  const captureId = `CAPTURE_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
  mockOrders.set(paypalOrderId, {
    cart,
    status: "COMPLETED",
    captureId,
  });

  return PaymentOrderSchema.parse({
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
  });
}

