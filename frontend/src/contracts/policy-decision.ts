import { z } from 'zod';

export const PolicyVerdictSchema = z.enum(['allow', 'needs_approval', 'deny']);

export type PolicyVerdict = z.infer<typeof PolicyVerdictSchema>;

export const PolicyDecisionSchema = z.object({
  verdict: PolicyVerdictSchema,
  reasons: z.array(z.string()),
  ruleIds: z.array(z.string()),
  evaluatedAt: z.string(),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;

