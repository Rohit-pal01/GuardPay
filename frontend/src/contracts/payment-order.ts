import { z } from 'zod';
import { CartItemSchema } from './cart';

export const AmountBreakdownSchema = z.object({
  itemTotal: z.number().nonnegative(),
  taxTotal: z.number().nonnegative(),
  shipping: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export type AmountBreakdown = z.infer<typeof AmountBreakdownSchema>;

export const PaymentOrderStatusSchema = z.enum([
  'CREATED',
  'APPROVED',
  'COMPLETED',
  'FAILED',
]);

export type PaymentOrderStatus = z.infer<typeof PaymentOrderStatusSchema>;

export const PaymentOrderSchema = z.object({
  id: z.string().min(1),
  paypalOrderId: z.string().min(1),
  captureId: z.string().optional(),
  cartId: z.string().min(1),
  mandateId: z.string().min(1),
  sessionId: z.string().min(1),
  status: PaymentOrderStatusSchema,
  amount: z.number().nonnegative(),
  breakdown: AmountBreakdownSchema,
  currency: z.literal('USD'),
  items: z.array(CartItemSchema),
  sandboxMode: z.boolean(),
  createdAt: z.string(),
  capturedAt: z.string().optional(),
});

export type PaymentOrder = z.infer<typeof PaymentOrderSchema>;

