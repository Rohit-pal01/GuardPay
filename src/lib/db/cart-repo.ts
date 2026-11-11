import { Cart, CartSchema } from "@/contracts/cart.js";

const cartStore = new Map<string, Cart>();

export function getCart(id: string): Cart | undefined {
  return cartStore.get(id);
}

export function saveCart(cart: Cart): Cart {
  const parsed = CartSchema.parse(cart);
  cartStore.set(parsed.id, parsed);
  return parsed;
}

export function updateCartStatus(id: string, status: Cart["status"]): Cart | undefined {
  const cart = cartStore.get(id);
  if (!cart) return undefined;
  cart.status = status;
  cartStore.set(id, cart);
  return cart;
}
