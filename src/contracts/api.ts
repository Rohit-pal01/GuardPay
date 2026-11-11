import { z } from "zod";
import { MandateSchema } from "./mandate.js";
import { CartSchema } from "./cart.js";
import { PaymentOrderSchema } from "./payment-order.js";
import { CandidateSchema } from "./product.js";

export const ParsedIntentSchema = z.object({
  query: z.string().describe("Search query to send to product catalog"),
  category: z.string().optional().describe("Inferred product category"),
  maxPrice: z.number().positive().optional().describe("User-specified maximum budget"),
  deliverBy: z.string().optional().describe("Target delivery date constraint (e.g. ISO string or 'Friday')"),
  preferredMerchant: z.string().optional().describe("Preferred seller/merchant if any"),
  features: z.array(z.string()).default([]).describe("Key product features requested by user"),
  rawRequest: z.string().describe("Original user request text"),
});

export const RunAgentRequestSchema = z.object({
  request: z.string().min(1),
  mandateId: z.string().min(1),
  sessionId: z.string().optional(),
});

export const StartNegotiateRequestSchema = z.object({
  candidateId: z.string().min(1),
  mandateId: z.string().min(1),
  sessionId: z.string().optional(),
});

export const ApproveCartRequestSchema = z.object({
  cartId: z.string().min(1),
});

export const CreateOrderRequestSchema = z.object({
  cartId: z.string().min(1),
});

export const CaptureOrderRequestSchema = z.object({
  paypalOrderId: z.string().min(1),
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;
export type RunAgentRequest = z.infer<typeof RunAgentRequestSchema>;
export type StartNegotiateRequest = z.infer<typeof StartNegotiateRequestSchema>;
export type ApproveCartRequest = z.infer<typeof ApproveCartRequestSchema>;
export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export type CaptureOrderRequest = z.infer<typeof CaptureOrderRequestSchema>;
