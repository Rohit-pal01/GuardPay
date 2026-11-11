import { z } from "zod";

export const PaymentOrderStatusSchema = z.enum(["created", "approved", "captured", "failed"]);

export const PaymentOrderSchema = z.object({
  id: z.string().min(1),
  cartId: z.string().min(1),
  mandateId: z.string().min(1),
  paypalOrderId: z.string().min(1),
  captureId: z.string().optional(),
  amount: z.number().nonnegative(),
  currency: z.literal("USD").default("USD"),
  status: PaymentOrderStatusSchema.default("created"),
  createdAt: z.string().default(() => new Date().toISOString()),
  capturedAt: z.string().optional(),
});

export type PaymentOrderStatus = z.infer<typeof PaymentOrderStatusSchema>;
export type PaymentOrder = z.infer<typeof PaymentOrderSchema>;
