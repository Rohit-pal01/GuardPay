import { z } from 'zod';

export const MandateSchema = z.object({
  id: z.string().min(1),
  maxPerPurchase: z.number().positive(),
  maxSessionTotal: z.number().positive(),
  allowedCategories: z.array(z.string().min(1)),
  blockedMerchants: z.array(z.string().min(1)),
  deliverBy: z.string().optional(),
  autoApproveBelow: z.number().nonnegative(),
  currency: z.literal('USD'),
  expiresAt: z.string().min(1),
});

export type Mandate = z.infer<typeof MandateSchema>;

export const MandateUpsertSchema = MandateSchema.omit({ id: true }).extend({
  id: z.string().min(1).optional(),
});

export type MandateUpsert = z.infer<typeof MandateUpsertSchema>;
