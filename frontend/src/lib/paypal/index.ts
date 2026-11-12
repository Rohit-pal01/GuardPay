import type { Cart } from '@/contracts/cart';
import type { PaymentOrder } from '@/contracts/payment-order';
import { getOrder as getStoredOrder } from '@/lib/db/order-repo';
import { capturePayPalOrder } from './capture';
import { createPayPalOrder, getPayPalOrder } from './orders';

export * from './client';
export * from './orders';
export * from './capture';
export * from './mock';
export * from './vault';

/**
 * Interface contract with A1 (SRS Section 4):
 * createOrder, getOrder, captureOrder
 */
export async function createOrder(cart: Cart): Promise<PaymentOrder> {
  const result = await createPayPalOrder(cart);
  return result.order;
}

export async function getOrder(paypalOrderId: string): Promise<PaymentOrder> {
  const order = await getStoredOrder(paypalOrderId);
  if (order) {
    return order;
  }
  return getPayPalOrder(paypalOrderId);
}

export async function captureOrder(paypalOrderId: string, cart: Cart): Promise<PaymentOrder> {
  return capturePayPalOrder(paypalOrderId, cart);
}

export * from './errors';
