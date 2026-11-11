import { z } from 'zod';

export const NegotiationTurnSchema = z.object({
  from: z.enum(['buyer', 'seller']),
  price: z.number(), // USD per unit
  at: z.string().datetime(),
});

export const NegotiationSchema = z.object({
  id: z.string().min(1),
  cartId: z.string().min(1),
  itemId: z.string().min(1),
  listedPrice: z.number(), // USD per unit
  agreedPrice: z.number().optional(), // USD per unit, set when settled
  status: z.enum(['open', 'settled', 'failed']),
  turns: z.array(NegotiationTurnSchema),
});
export type Negotiation = z.infer<typeof NegotiationSchema>;
