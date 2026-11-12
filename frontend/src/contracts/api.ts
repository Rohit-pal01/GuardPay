import { z } from 'zod';
import { MandateUpsertSchema } from './mandate';

export const ParsedIntentSchema = z.object({
  query: z.string().describe('Search query to send to product catalog'),
  category: z.string().optional().describe('Inferred product category'),
  maxPrice: z.number().positive().optional().describe('User-specified maximum budget'),
  maxBudget: z.number().positive().optional().describe('Alias for maxPrice'),
  deliverBy: z.string().optional().describe('Target delivery date constraint'),
  preferredMerchant: z.string().optional().describe('Preferred seller/merchant'),
  features: z.array(z.string()).default([]).describe('Key product features requested'),
  rawRequest: z.string().optional().describe('Original user request text'),
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

export const AgentRunRequestSchema = z.object({
  request: z.string().min(1, 'Enter what you want GaurdPay to buy'),
  mandateId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;

export const RunAgentRequestSchema = AgentRunRequestSchema;
export type RunAgentRequest = AgentRunRequest;

export const MandatePostRequestSchema = MandateUpsertSchema;

export type MandatePostRequest = z.infer<typeof MandatePostRequestSchema>;

export const CartApproveRequestSchema = z.object({
  cartId: z.string().min(1),
});

export type CartApproveRequest = z.infer<typeof CartApproveRequestSchema>;

export const ApproveCartRequestSchema = CartApproveRequestSchema;
export type ApproveCartRequest = CartApproveRequest;

export const CartApproveResponseSchema = z.object({
  approved: z.literal(true),
});

export type CartApproveResponse = z.infer<typeof CartApproveResponseSchema>;

export const OrderCreateRequestSchema = z.object({
  cartId: z.string().min(1),
});

export type OrderCreateRequest = z.infer<typeof OrderCreateRequestSchema>;

export const CreateOrderRequestSchema = OrderCreateRequestSchema;
export type CreateOrderRequest = OrderCreateRequest;

export const OrderCreateResponseSchema = z.object({
  paypalOrderId: z.string().min(1),
});

export type OrderCreateResponse = z.infer<typeof OrderCreateResponseSchema>;

export const OrderCaptureRequestSchema = z.object({
  paypalOrderId: z.string().min(1),
});

export type OrderCaptureRequest = z.infer<typeof OrderCaptureRequestSchema>;

export const CaptureOrderRequestSchema = OrderCaptureRequestSchema;
export type CaptureOrderRequest = OrderCaptureRequest;

export const NegotiateStartRequestSchema = z.object({
  candidateId: z.string().min(1),
  mandateId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

export type NegotiateStartRequest = z.infer<typeof NegotiateStartRequestSchema>;

export const StartNegotiateRequestSchema = NegotiateStartRequestSchema;
export type StartNegotiateRequest = NegotiateStartRequest;

export const AuditQuerySchema = z.object({
  sessionId: z.string().min(1).optional(),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;


