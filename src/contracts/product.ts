import { z } from "zod";

export const ShippingInfoSchema = z.object({
  cost: z.number().nonnegative().default(0),
  estimatedDays: z.number().int().positive().optional(),
  deliverBy: z.string().optional(),
  estimated: z.boolean().default(false),
});

export const CandidateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  price: z.number().nonnegative(),
  currency: z.string().default("USD"),
  merchant: z.string().default("Unknown"),
  category: z.string().default("General"),
  url: z.string().url().or(z.string()),
  imageUrl: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  shippingInfo: ShippingInfoSchema.optional(),
  availability: z.enum(["in_stock", "out_of_stock", "limited"]).default("in_stock"),
  explanation: z.string().optional(),
  score: z.number().optional(),
});

export type ShippingInfo = z.infer<typeof ShippingInfoSchema>;
export type Candidate = z.infer<typeof CandidateSchema>;
