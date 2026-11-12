import { type Cart, CartSchema } from '@/contracts/cart';

const cartStore = new Map<string, Cart>();

export function getCart(id: string): Cart | undefined {
  return cartStore.get(id);
}

export function saveCart(cart: Cart): Cart {
  const parsed = CartSchema.parse(cart);
  cartStore.set(parsed.id, parsed);
  return parsed;
}

/**
 * Updates cart approval status in the authoritative database.
 * This is the ONLY source of truth for human approvals (Requirement 3).
 */
export function updateCartApproval(id: string, approved: boolean): Cart | undefined {
  const existing = cartStore.get(id);
  if (!existing) return undefined;

  const updated: Cart = {
    ...existing,
    approved,
    approvedAt: approved ? new Date().toISOString() : undefined,
  };

  const validated = CartSchema.parse(updated);
  cartStore.set(id, validated);
  return validated;
}

export function listCarts(): Cart[] {
  return Array.from(cartStore.values());
}

export function resetCarts(): void {
  cartStore.clear();
}
