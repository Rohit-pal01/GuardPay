import { z } from 'zod';

export const CartItemSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  merchant: z.string(),
  category: z.string(),
  unitPrice: z.number(), // USD. Sign/zero is judged by the Policy Engine, not here.
  quantity: z.number().int().positive(),
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  mandateId: z.string().min(1),
  items: z.array(CartItemSchema).min(1),
  currency: z.literal('USD'),
  createdAt: z.string().datetime(),
  estimatedDelivery: z.string().datetime().optional(),
});
export type Cart = z.infer<typeof CartSchema>;
