import { z } from 'zod';

export const AGENT_EVENT_TYPES = [
  'intent_parsed', 'search_started', 'candidates_found', 'ranked', 'cart_ready',
  'policy_checked', 'awaiting_approval', 'approved', 'order_created', 'payment_captured',
  'negotiation_turn', 'negotiation_settled', 'blocked', 'error',
] as const;

export const AgentEventSchema = z.object({
  sessionId: z.string().min(1),
  type: z.enum(AGENT_EVENT_TYPES),
  at: z.string().datetime(),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});
export type AgentEvent = z.infer<typeof AgentEventSchema>;

// An AuditEvent is an AgentEvent as stored (it has an id).
export const AuditEventSchema = AgentEventSchema.extend({ id: z.string().min(1) });
export type AuditEvent = z.infer<typeof AuditEventSchema>;
