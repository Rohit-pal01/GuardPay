import { z } from 'zod';
import { MandateSchema } from './mandate';

export const CreateMandateRequestSchema = MandateSchema.extend({ id: z.string().min(1).optional() });
export type CreateMandateRequest = z.infer<typeof CreateMandateRequestSchema>;

export const ApproveCartRequestSchema = z.object({ cartId: z.string().min(1) });
export type ApproveCartRequest = z.infer<typeof ApproveCartRequestSchema>;

export const AuditQuerySchema = z.object({ sessionId: z.string().min(1) });
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
