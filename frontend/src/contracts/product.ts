import { z } from 'zod';

export const ProductAvailabilitySchema = z.enum([
  'in_stock',
  'limited',
  'out_of_stock',
]);

export type ProductAvailability = z.infer<typeof ProductAvailabilitySchema>;

export const CandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  price: z.number().nonnegative(),
  currency: z.literal('USD'),
  merchant: z.string().min(1),
  category: z.string().min(1),
  url: z.string().url(),
  imageUrl: z.string().optional(),
  availability: ProductAvailabilitySchema,
  deliveryEstimate: z.string().optional(),
  deliveryEstimated: z.boolean(),
  rankScore: z.number().optional(),
  reason: z.string().optional(),
  sanitizedFlags: z.array(z.string()).optional(),
});

export type Candidate = z.infer<typeof CandidateSchema>;

export const ParsedIntentSchema = z.object({
  query: z.string().min(1),
  maxBudget: z.number().positive().optional(),
  category: z.string().optional(),
  deliverBy: z.string().optional(),
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;
