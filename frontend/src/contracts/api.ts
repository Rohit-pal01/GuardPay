import { z } from 'zod';
import { MandateUpsertSchema } from './mandate';

export const AgentRunRequestSchema = z.object({
  request: z.string().min(1, 'Enter what you want GaurdPay to buy'),
  mandateId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;

export const MandatePostRequestSchema = MandateUpsertSchema;

export type MandatePostRequest = z.infer<typeof MandatePostRequestSchema>;

export const CartApproveRequestSchema = z.object({
  cartId: z.string().min(1),
});

export type CartApproveRequest = z.infer<typeof CartApproveRequestSchema>;

export const CartApproveResponseSchema = z.object({
  approved: z.literal(true),
});

export type CartApproveResponse = z.infer<typeof CartApproveResponseSchema>;

export const OrderCreateRequestSchema = z.object({
  cartId: z.string().min(1),
});

export type OrderCreateRequest = z.infer<typeof OrderCreateRequestSchema>;

export const OrderCreateResponseSchema = z.object({
  paypalOrderId: z.string().min(1),
});

export type OrderCreateResponse = z.infer<typeof OrderCreateResponseSchema>;

export const OrderCaptureRequestSchema = z.object({
  paypalOrderId: z.string().min(1),
});

export type OrderCaptureRequest = z.infer<typeof OrderCaptureRequestSchema>;

export const NegotiateStartRequestSchema = z.object({
  candidateId: z.string().min(1),
  mandateId: z.string().min(1),
  sessionId: z.string().min(1).optional(),
});

export type NegotiateStartRequest = z.infer<typeof NegotiateStartRequestSchema>;

