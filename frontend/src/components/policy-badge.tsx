import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { PolicyDecision } from '@/contracts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PolicyBadgeProps {
  decision: PolicyDecision | null;
  compact?: boolean;
  className?: string;
}

const VERDICT_META = {
  allow: {
    label: 'ALLOW • Mandate Passed',
    icon: CheckCircle2,
    boxClass: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100',
  },
  needs_approval: {
    label: 'NEEDS APPROVAL • Human Gate',
    icon: AlertTriangle,
    boxClass: 'border-amber-400/35 bg-amber-500/10 text-amber-100',
  },
  deny: {
    label: 'DENY • Blocked by Code',
    icon: ShieldAlert,
    boxClass: 'border-red-400/40 bg-red-500/12 text-red-100',
  },
} as const;

export function PolicyBadge({ decision, compact = false, className }: PolicyBadgeProps) {
  if (!decision) {
    return (
      <Badge variant="default" className={className}>
        Policy Idle
      </Badge>
    );
  }

  const meta = VERDICT_META[decision.verdict];
  const Icon = meta.icon;

  if (compact) {
    return (
      <Badge variant={decision.verdict} className={className}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {meta.label}
      </Badge>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('rounded-2xl border p-4 transition-colors', meta.boxClass, className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant={decision.verdict}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.label}
        </Badge>
        <div className="flex flex-wrap gap-1.5">
          {decision.ruleIds.map((ruleId) => (
            <code
              key={ruleId}
              className="rounded-full border border-white/15 bg-black/45 px-2 py-0.5 text-[11px] font-mono text-white/80"
            >
              {ruleId}
            </code>
          ))}
        </div>
      </div>

      {decision.reasons.length > 0 && (
        <ul className="mt-2.5 space-y-1 text-xs leading-relaxed text-white/90">
          {decision.reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

