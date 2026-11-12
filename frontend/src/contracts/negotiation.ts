import { z } from 'zod';

export const NegotiationTurnSchema = z.object({
  round: z.number().int().min(1).max(4),
  actor: z.enum(['buyer_agent', 'seller_agent']),
  proposedPrice: z.number().nonnegative(),
  message: z.string().min(1),
  accepted: z.boolean(),
  timestamp: z.string(),
});

export type NegotiationTurn = z.infer<typeof NegotiationTurnSchema>;

export const NegotiationStatusSchema = z.enum([
  'active',
  'settled',
  'walked_away',
]);

export type NegotiationStatus = z.infer<typeof NegotiationStatusSchema>;

export const NegotiationSchema = z.object({
  id: z.string().min(1),
  candidateId: z.string().min(1),
  mandateId: z.string().min(1),
  initialPrice: z.number().nonnegative(),
  agreedPrice: z.number().nonnegative().optional(),
  status: NegotiationStatusSchema,
  maxRounds: z.literal(4),
  turns: z.array(NegotiationTurnSchema),
});

export type Negotiation = z.infer<typeof NegotiationSchema>;

