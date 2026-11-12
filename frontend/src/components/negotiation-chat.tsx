'use client';

import React from 'react';
import { Bot, CheckCircle2, Loader2, Store, X } from 'lucide-react';
import type { Candidate, Mandate, NegotiationTurn } from '@/contracts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatUsd } from '@/lib/utils';

interface NegotiationChatProps {
  candidate: Candidate | null;
  mandate: Mandate;
  turns: NegotiationTurn[];
  isRunning: boolean;
  agreedPrice: number | null;
  onDismiss: () => void;
}

export function NegotiationChat({
  candidate,
  mandate,
  turns,
  isRunning,
  agreedPrice,
  onDismiss,
}: NegotiationChatProps) {
  if (!candidate && turns.length === 0) return null;

  return (
    <Card className="border-white/20 bg-[#141418]/95">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              Live Buyer / Seller Agent Negotiation
            </CardTitle>
            <Badge variant={agreedPrice !== null ? 'allow' : 'default'}>
              {isRunning
                ? 'Haggling (Max 4 Rounds)...'
                : agreedPrice !== null
                  ? `Settled at ${formatUsd(agreedPrice)}`
                  : 'Ready'}
            </Badge>
          </div>
          {candidate && (
            <p className="mt-1 text-xs text-[#8e8e8e]">
              Item: <span className="text-white">{candidate.title}</span> &bull; List{' '}
              <span className="tabular-nums">{formatUsd(candidate.price)}</span> &bull; Mandate Cap{' '}
              <span className="tabular-nums">{formatUsd(mandate.maxPerPurchase)}</span>
            </p>
          )}
        </div>

        <button
          type="button"
          aria-label="Close negotiation panel"
          onClick={onDismiss}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8e8e8e] hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2.5" aria-live="polite">
          {turns.map((turn) => {
            const isBuyer = turn.actor === 'buyer_agent';
            return (
              <div
                key={`${turn.round}-${turn.actor}`}
                className={cn(
                  'flex flex-col gap-1 rounded-2xl border p-3.5 text-xs',
                  isBuyer
                    ? 'border-white/15 bg-[#28282a]/70 mr-6'
                    : 'border-indigo-400/25 bg-indigo-500/10 ml-6'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                    {isBuyer ? (
                      <Bot className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
                    ) : (
                      <Store className="h-3.5 w-3.5 text-indigo-300" aria-hidden="true" />
                    )}
                    {isBuyer ? 'Buyer Agent' : 'Seller Agent'} &bull; Round {turn.round}/4
                  </span>

                  <Badge variant={turn.accepted ? 'allow' : 'outline'}>
                    {turn.accepted && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                    {formatUsd(turn.proposedPrice)}
                  </Badge>
                </div>

                <p className="leading-relaxed text-[#d4d4d8]">{turn.message}</p>
              </div>
            );
          })}

          {isRunning && (
            <div className="flex items-center gap-2 text-xs text-[#8e8e8e] px-2 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              Negotiating next round within Mandate bounds...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

