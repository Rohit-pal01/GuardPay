import { z } from 'zod';

export const CartItemSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  merchant: z.string().min(1),
  category: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  retailerUrl: z.string().url(),
  deliveryEstimate: z.string().optional(),
  deliveryEstimated: z.boolean(),
});

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.object({
  id: z.string().min(1),
  mandateId: z.string().min(1),
  sessionId: z.string().min(1),
  items: z.array(CartItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
  currency: z.literal('USD'),
  approved: z.boolean(),
  approvedAt: z.string().optional(),
  createdAt: z.string(),
  priceSnapshotAt: z.string(),
  negotiatedFromPrice: z.number().nonnegative().optional(),
});

export type Cart = z.infer<typeof CartSchema>;

