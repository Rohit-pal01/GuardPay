import { z } from 'zod';

export const ProductAvailabilitySchema = z.enum([
  'in_stock',
  'limited',
  'out_of_stock',
]);

export type ProductAvailability = z.infer<typeof ProductAvailabilitySchema>;

export const ShippingInfoSchema = z.object({
  cost: z.number().nonnegative().default(0),
  estimatedDays: z.number().int().positive().optional(),
  deliverBy: z.string().optional(),
  estimated: z.boolean().default(false),
});

export type ShippingInfo = z.infer<typeof ShippingInfoSchema>;

export const CandidateSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>;
      const si = v.shippingInfo as Record<string, unknown> | undefined;
      const rankScore = v.rankScore ?? v.score;
      const reason = v.reason ?? v.explanation;
      const deliveryEstimated = v.deliveryEstimated ?? si?.estimated ?? false;
      const deliveryEstimate = v.deliveryEstimate ?? si?.deliverBy;
      const url = v.url || 'https://guardpay.local/item';
      const description = v.description || '';
      return {
        ...v,
        rankScore,
        score: rankScore,
        reason,
        explanation: reason,
        deliveryEstimated,
        deliveryEstimate,
        url,
        description,
      };
    }
    return val;
  },
  z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().default(''),
    price: z.number().nonnegative(),
    currency: z.string().default('USD'),
    merchant: z.string().min(1),
    category: z.string().min(1),
    url: z.string().default('https://guardpay.local/item'),
    imageUrl: z.string().optional(),
    rating: z.number().min(0).max(5).optional(),
    shippingInfo: ShippingInfoSchema.optional(),
    availability: ProductAvailabilitySchema.default('in_stock'),
    deliveryEstimate: z.string().optional(),
    deliveryEstimated: z.boolean().default(false).optional(),
    rankScore: z.number().optional(),
    score: z.number().optional(),
    reason: z.string().optional(),
    explanation: z.string().optional(),
    sanitizedFlags: z.array(z.string()).optional(),
  }),
);

export type Candidate = z.infer<typeof CandidateSchema>;
