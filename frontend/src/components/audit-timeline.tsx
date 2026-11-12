import React from 'react';
import { Activity, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import type { AgentEvent, AgentEventType, AuditEvent } from '@/contracts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AuditTimelineProps {
  events: (AgentEvent | AuditEvent)[];
  isLive?: boolean;
  title?: string;
}

const EVENT_TONE: Record<AgentEventType, string> = {
  intent_parsed: 'bg-sky-400',
  search_started: 'bg-sky-400',
  candidates_found: 'bg-indigo-400',
  ranked: 'bg-indigo-400',
  cart_ready: 'bg-white',
  policy_checked: 'bg-amber-300',
  awaiting_approval: 'bg-amber-400',
  approved: 'bg-emerald-400',
  order_created: 'bg-emerald-400',
  payment_captured: 'bg-emerald-400',
  negotiation_turn: 'bg-violet-400',
  negotiation_settled: 'bg-emerald-400',
  blocked: 'bg-red-500',
  error: 'bg-red-500',
};

export function AuditTimeline({
  events,
  isLive = false,
  title = 'Live Audit Timeline',
}: AuditTimelineProps) {
  return (
    <Card className="border-white/15 bg-[#121214]/90">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg text-white" aria-hidden="true">
            04
          </span>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>

        <Badge variant={isLive ? 'allow' : 'default'}>
          <Activity className={cn('h-3.5 w-3.5', isLive && 'animate-pulse')} aria-hidden="true" />
          {isLive ? 'SSE Live' : `${events.length} Events`}
        </Badge>
      </CardHeader>

      <CardContent>
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/35 p-6 text-center text-xs text-[#8e8e8e]">
            Every agent step, Policy Engine verdict, negotiation turn, and PayPal capture streams here in real time.
          </div>
        ) : (
          <ol className="relative ml-2 space-y-4 border-l border-white/15 pl-5" aria-live="polite">
            {events.map((event) => {
              const dotClass = EVENT_TONE[event.type] ?? 'bg-white';
              const isBlocked = event.type === 'blocked' || event.type === 'error';
              const isCaptured = event.type === 'payment_captured' || event.type === 'approved';

              return (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[#121214]',
                      dotClass
                    )}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isBlocked ? (
                        <ShieldAlert className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                      ) : isCaptured ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-[#8e8e8e]" aria-hidden="true" />
                      )}
                      <code className="text-[11px] font-mono font-medium text-white">
                        {event.type}
                      </code>
                    </div>
                    <time
                      dateTime={event.timestamp}
                      className="text-[11px] text-[#8e8e8e] tabular-nums"
                    >
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </time>
                  </div>

                  <p
                    className={cn(
                      'mt-1 text-xs leading-relaxed',
                      isBlocked ? 'text-red-200' : 'text-[#d0d0d0]'
                    )}
                  >
                    {event.message}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

