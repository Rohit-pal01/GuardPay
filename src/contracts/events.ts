import { z } from "zod";

export const AgentEventTypeSchema = z.enum([
  "intent_parsed",
  "search_started",
  "candidates_found",
  "ranked",
  "cart_ready",
  "policy_checked",
  "awaiting_approval",
  "approved",
  "order_created",
  "payment_captured",
  "negotiation_turn",
  "negotiation_settled",
  "blocked",
  "error",
]);

export const AgentEventSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  type: AgentEventTypeSchema,
  message: z.string(),
  payload: z.record(z.string(), z.any()).default({}),
  timestamp: z.string().default(() => new Date().toISOString()),
});

export const AuditEventSchema = AgentEventSchema;

export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;
