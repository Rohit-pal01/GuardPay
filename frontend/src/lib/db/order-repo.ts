import { eq, or } from 'drizzle-orm';
import { type PaymentOrder, PaymentOrderSchema, type PaymentOrderStatus } from '@/contracts/payment-order';
import { db, isDatabaseEnabled } from './client';
import { paymentOrders } from './schema';

const orderStore = new Map<string, PaymentOrder>();

function recordToOrder(record: typeof paymentOrders.$inferSelect): PaymentOrder {
  return PaymentOrderSchema.parse({
    ...record, amount: Number(record.amount), items: record.items,
    breakdown: record.breakdown, status: record.status,
  });
}

export async function getOrder(idOrPaypalOrderId: string): Promise<PaymentOrder | undefined> {
  if (!isDatabaseEnabled) {
    const direct = orderStore.get(idOrPaypalOrderId);
    return direct || Array.from(orderStore.values()).find((order) => order.paypalOrderId === idOrPaypalOrderId);
  }
  const [record] = await db!.select().from(paymentOrders).where(or(
    eq(paymentOrders.id, idOrPaypalOrderId), eq(paymentOrders.paypalOrderId, idOrPaypalOrderId),
  )).limit(1);
  return record ? recordToOrder(record) : undefined;
}

export async function saveOrder(order: PaymentOrder): Promise<PaymentOrder> {
  const parsed = PaymentOrderSchema.parse(order);
  if (!isDatabaseEnabled) { orderStore.set(parsed.id, parsed); orderStore.set(parsed.paypalOrderId, parsed); return parsed; }
  await db!.insert(paymentOrders).values({
    ...parsed, amount: String(parsed.amount), items: parsed.items, breakdown: parsed.breakdown,
  }).onConflictDoUpdate({ target: paymentOrders.id, set: {
    paypalOrderId: parsed.paypalOrderId, captureId: parsed.captureId, cartId: parsed.cartId,
    mandateId: parsed.mandateId, sessionId: parsed.sessionId, status: parsed.status,
    amount: String(parsed.amount), breakdown: parsed.breakdown, currency: parsed.currency, items: parsed.items,
    sandboxMode: parsed.sandboxMode, capturedAt: parsed.capturedAt, failureReason: parsed.failureReason,
  } });
  return parsed;
}

export async function updateOrderStatus(paypalOrderId: string, status: PaymentOrderStatus, captureId?: string): Promise<PaymentOrder | undefined> {
  const existing = await getOrder(paypalOrderId);
  if (!existing) return undefined;
  return saveOrder({ ...existing, status, captureId: captureId ?? existing.captureId, capturedAt: status === 'COMPLETED' ? new Date().toISOString() : existing.capturedAt });
}

export async function listOrders(): Promise<PaymentOrder[]> {
  if (!isDatabaseEnabled) return Array.from(new Map(Array.from(orderStore.values()).map((order) => [order.id, order])).values());
  return (await db!.select().from(paymentOrders)).map(recordToOrder);
}

export async function resetOrders(): Promise<void> { if (!isDatabaseEnabled) orderStore.clear(); }
