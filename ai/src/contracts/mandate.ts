import { z } from "zod";

export const MandateSchema = z.object({
  id: z.string().min(1),
  maxPerPurchase: z.number().positive(),
  maxSessionTotal: z.number().positive(),
  allowedCategories: z.array(z.string()).default([]),
  blockedMerchants: z.array(z.string()).default([]),
  deliverBy: z.string().optional(),
  autoApproveBelow: z.number().nonnegative().default(0),
  currency: z.literal("USD").default("USD"),
  expiresAt: z.string(),
});

export type Mandate = z.infer<typeof MandateSchema>;

