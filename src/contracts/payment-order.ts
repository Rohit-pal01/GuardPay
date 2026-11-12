import { z } from "zod";

export const PaymentOrderSchema = z.object({
  paypalOrderId: z.string().min(1),
  cartId: z.string().min(1),
  amount: z.number(), // USD
  currency: z.literal("USD"),
  status: z.enum(["created", "captured", "failed"]),
  captureId: z.string().optional(),
});
export type PaymentOrder = z.infer<typeof PaymentOrderSchema>;
