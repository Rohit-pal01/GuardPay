import type { Cart } from '@/contracts/cart';
import type { PaymentOrder } from '@/contracts/payment-order';
import { getOrder as getStoredOrder } from '@/lib/db/order-repo';
import { capturePayPalOrder } from './capture';
import { createPayPalOrder } from './orders';

export * from './client';
export * from './orders';
export * from './capture';
export * from './mock';

/**
 * Interface contract with A1 (SRS Section 4):
 * createOrder, getOrder, captureOrder
 */
export async function createOrder(cart: Cart): Promise<PaymentOrder> {
  const result = await createPayPalOrder(cart);
  return result.order;
}

export async function getOrder(paypalOrderId: string): Promise<PaymentOrder> {
  const order = getStoredOrder(paypalOrderId);
  if (!order) {
    throw new Error(`PayPal order ${paypalOrderId} not found.`);
  }
  return order;
}

export async function captureOrder(paypalOrderId: string, cart: Cart): Promise<PaymentOrder> {
  return capturePayPalOrder(paypalOrderId, cart);
}
