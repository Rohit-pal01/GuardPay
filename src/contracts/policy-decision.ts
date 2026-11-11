import { z } from 'zod';

export const PolicyDecisionSchema = z.object({
  verdict: z.enum(['allow', 'needs_approval', 'deny']),
  reasons: z.array(z.string()),
  ruleIds: z.array(z.string()),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
