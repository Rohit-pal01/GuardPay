import { z } from "zod";

export const MandateSchema = z.object({
  id: z.string().min(1),
  maxPerPurchase: z.number().positive(),
  maxSessionTotal: z.number().positive(),
  allowedCategories: z.array(z.string().min(1)),
  blockedMerchants: z.array(z.string().min(1)),
  deliverBy: z.string().datetime().optional(),
  autoApproveBelow: z.number().nonnegative(),
  currency: z.literal("USD"),
  expiresAt: z.string().datetime(),
});
export type Mandate = z.infer<typeof MandateSchema>;
