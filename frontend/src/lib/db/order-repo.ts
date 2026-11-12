import { type PaymentOrder, PaymentOrderSchema, type PaymentOrderStatus } from '@/contracts/payment-order';

const orderStore = new Map<string, PaymentOrder>();

export function getOrder(idOrPaypalOrderId: string): PaymentOrder | undefined {
  const byDirectId = orderStore.get(idOrPaypalOrderId);
  if (byDirectId) return byDirectId;

  for (const order of orderStore.values()) {
    if (order.paypalOrderId === idOrPaypalOrderId) {
      return order;
    }
  }
  return undefined;
}

export function saveOrder(order: PaymentOrder): PaymentOrder {
  const parsed = PaymentOrderSchema.parse(order);
  orderStore.set(parsed.id, parsed);
  orderStore.set(parsed.paypalOrderId, parsed);
  return parsed;
}

export function updateOrderStatus(
  paypalOrderId: string,
  status: PaymentOrderStatus,
  captureId?: string
): PaymentOrder | undefined {
  const existing = getOrder(paypalOrderId);
  if (!existing) return undefined;

  const updated: PaymentOrder = {
    ...existing,
    status,
    captureId: captureId ?? existing.captureId,
    capturedAt: status === 'COMPLETED' ? new Date().toISOString() : existing.capturedAt,
  };

  const parsed = PaymentOrderSchema.parse(updated);
  orderStore.set(parsed.id, parsed);
  orderStore.set(parsed.paypalOrderId, parsed);
  return parsed;
}

export function listOrders(): PaymentOrder[] {
  // deduplicate by id
  const map = new Map<string, PaymentOrder>();
  for (const order of orderStore.values()) {
    map.set(order.id, order);
  }
  return Array.from(map.values());
}

export function resetOrders(): void {
  orderStore.clear();
}
