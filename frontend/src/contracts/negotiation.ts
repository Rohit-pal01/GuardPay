import { z } from 'zod';

export const NegotiationTurnSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>;
      const actor = v.actor ?? (v.speaker === 'buyer' ? 'buyer_agent' : 'seller_agent');
      const speaker = v.speaker ?? (v.actor === 'buyer_agent' ? 'buyer' : 'seller');
      const proposedPrice = (v.proposedPrice ?? v.offerPrice ?? 0) as number;
      const offerPrice = proposedPrice;
      const msg = typeof v.message === 'string' ? v.message.toLowerCase() : '';
      const accepted =
        v.accepted ??
        (msg.includes('deal') ||
          msg.includes('agreed') ||
          false);
      const timestamp = v.timestamp || new Date().toISOString();
      return {
        ...v,
        actor,
        speaker,
        proposedPrice,
        offerPrice,
        accepted,
        timestamp,
      };
    }
    return val;
  },
  z.object({
    round: z.number().int().min(1).max(4),
    actor: z.enum(['buyer_agent', 'seller_agent']).default('buyer_agent').optional(),
    speaker: z.enum(['buyer', 'seller']).default('buyer').optional(),
    proposedPrice: z.number().nonnegative().default(0).optional(),
    offerPrice: z.number().nonnegative().default(0).optional(),
    message: z.string().min(1),
    accepted: z.boolean().default(false).optional(),
    timestamp: z.string().default(() => new Date().toISOString()),
  }),
);

export type NegotiationTurn = z.infer<typeof NegotiationTurnSchema>;

export const NegotiationStatusSchema = z.enum([
  'active',
  'in_progress',
  'settled',
  'walked_away',
  'walk_away',
]);

export type NegotiationStatus = z.infer<typeof NegotiationStatusSchema>;

export const NegotiationSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>;
      const agreedPrice = v.agreedPrice ?? v.finalPrice;
      const finalPrice = agreedPrice;
      const floorPrice = v.floorPrice ?? (typeof v.initialPrice === 'number' ? v.initialPrice * 0.85 : 0);
      const ceilingPrice = v.ceilingPrice ?? (v.initialPrice ?? 0);
      const status =
        v.status === 'in_progress'
          ? 'active'
          : v.status === 'walk_away'
            ? 'walked_away'
            : v.status || 'active';
      return {
        ...v,
        agreedPrice,
        finalPrice,
        floorPrice,
        ceilingPrice,
        status,
        maxRounds: 4,
        turns: v.turns || [],
      };
    }
    return val;
  },
  z.object({
    id: z.string().min(1),
    candidateId: z.string().min(1),
    mandateId: z.string().min(1),
    initialPrice: z.number().nonnegative(),
    floorPrice: z.number().nonnegative().optional(),
    ceilingPrice: z.number().nonnegative().optional(),
    agreedPrice: z.number().nonnegative().optional(),
    finalPrice: z.number().nonnegative().optional(),
    status: NegotiationStatusSchema,
    maxRounds: z.literal(4).default(4),
    turns: z.array(NegotiationTurnSchema).default([]),
    summary: z.string().optional(),
  }),
);

export type Negotiation = z.infer<typeof NegotiationSchema>;

