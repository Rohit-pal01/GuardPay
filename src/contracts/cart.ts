import { z } from "zod";

export const CartItemSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive().default(1),
  merchant: z.string().default("Unknown"),
  category: z.string().default("General"),
  shippingCost: z.number().nonnegative().default(0),
});

export const CartSchema = z.object({
  id: z.string().min(1),
  mandateId: z.string().min(1),
  items: z.array(CartItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  shippingTotal: z.number().nonnegative().default(0),
  taxTotal: z.number().nonnegative().default(0),
  total: z.number().nonnegative(),
  currency: z.literal("USD").default("USD"),
  status: z.enum(["draft", "approved", "rejected", "negotiated"]).default("draft"),
  createdAt: z.string().default(() => new Date().toISOString()),
});

export type CartItem = z.infer<typeof CartItemSchema>;
export type Cart = z.infer<typeof CartSchema>;
