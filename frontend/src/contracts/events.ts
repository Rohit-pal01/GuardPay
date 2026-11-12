import { z } from 'zod';
import { PolicyVerdictSchema } from './policy-decision';

export const AgentEventTypeSchema = z.enum([
  'intent_parsed',
  'search_started',
  'candidates_found',
  'ranked',
  'cart_ready',
  'policy_checked',
  'awaiting_approval',
  'approved',
  'order_created',
  'payment_captured',
  'negotiation_turn',
  'negotiation_settled',
  'blocked',
  'error',
]);

export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;

export const AgentEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  type: AgentEventTypeSchema,
  timestamp: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.any()).optional(),
});

export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AuditEventSchema = AgentEventSchema.extend({
  mandateId: z.string().optional(),
  verdict: PolicyVerdictSchema.optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

