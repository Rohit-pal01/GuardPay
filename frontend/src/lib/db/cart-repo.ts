import { eq } from 'drizzle-orm';
import { type Cart, CartSchema } from '@/contracts/cart';
import { db, isDatabaseEnabled } from './client';
import { carts } from './schema';

const cartStore = new Map<string, Cart>();

function recordToCart(record: typeof carts.$inferSelect): Cart {
  return CartSchema.parse({
    ...record, items: record.items, subtotal: Number(record.subtotal), tax: Number(record.tax),
    shipping: Number(record.shipping), total: Number(record.total),
    negotiatedFromPrice: record.negotiatedFromPrice === null ? undefined : Number(record.negotiatedFromPrice),
  });
}

export async function getCart(id: string): Promise<Cart | undefined> {
  if (!isDatabaseEnabled) return cartStore.get(id);
  const [record] = await db!.select().from(carts).where(eq(carts.id, id)).limit(1);
  return record ? recordToCart(record) : undefined;
}

export async function saveCart(cart: Cart): Promise<Cart> {
  const parsed = CartSchema.parse(cart);
  if (!isDatabaseEnabled) { cartStore.set(parsed.id, parsed); return parsed; }
  await db!.insert(carts).values({
    ...parsed, items: parsed.items, subtotal: String(parsed.subtotal), tax: String(parsed.tax),
    shipping: String(parsed.shipping), total: String(parsed.total), negotiatedFromPrice: parsed.negotiatedFromPrice?.toString(),
  }).onConflictDoUpdate({ target: carts.id, set: {
    mandateId: parsed.mandateId, sessionId: parsed.sessionId, items: parsed.items,
    subtotal: String(parsed.subtotal), tax: String(parsed.tax), shipping: String(parsed.shipping), total: String(parsed.total),
    currency: parsed.currency, approved: parsed.approved, approvedAt: parsed.approvedAt, status: parsed.status,
    priceSnapshotAt: parsed.priceSnapshotAt, negotiatedFromPrice: parsed.negotiatedFromPrice?.toString(),
  } });
  return parsed;
}

export async function updateCartApproval(id: string, approved: boolean): Promise<Cart | undefined> {
  const existing = await getCart(id);
  if (!existing) return undefined;
  return saveCart({ ...existing, approved, approvedAt: approved ? new Date().toISOString() : undefined });
}

export async function listCarts(): Promise<Cart[]> {
  if (!isDatabaseEnabled) return Array.from(cartStore.values());
  return (await db!.select().from(carts)).map(recordToCart);
}

export async function resetCarts(): Promise<void> { if (!isDatabaseEnabled) cartStore.clear(); }
