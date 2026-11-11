import { z } from "zod";

export const NegotiationTurnSchema = z.object({
  round: z.number().int().min(1).max(4),
  speaker: z.enum(["buyer", "seller"]),
  offerPrice: z.number().positive(),
  message: z.string(),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export const NegotiationStatusSchema = z.enum(["in_progress", "settled", "walk_away"]);

export const NegotiationSchema = z.object({
  id: z.string().min(1),
  candidateId: z.string().min(1),
  mandateId: z.string().min(1),
  initialPrice: z.number().positive(),
  floorPrice: z.number().positive(),
  ceilingPrice: z.number().positive(),
  status: NegotiationStatusSchema.default("in_progress"),
  turns: z.array(NegotiationTurnSchema).default([]),
  finalPrice: z.number().positive().optional(),
  summary: z.string().optional(),
});

export type NegotiationTurn = z.infer<typeof NegotiationTurnSchema>;
export type NegotiationStatus = z.infer<typeof NegotiationStatusSchema>;
export type Negotiation = z.infer<typeof NegotiationSchema>;

