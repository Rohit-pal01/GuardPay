'use client';

import React from 'react';
import {
  Check,
  ExternalLink,
  MessageSquareMore,
  ShieldAlert,
  Truck,
} from 'lucide-react';
import type { Candidate } from '@/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, formatUsd } from '@/lib/utils';

interface CandidateCardProps {
  candidate: Candidate;
  rank: number;
  selected: boolean;
  onSelect: (candidate: Candidate) => void;
  onNegotiate: (candidate: Candidate) => void;
  negotiatingId?: string | null;
}

export function CandidateCard({
  candidate,
  rank,
  selected,
  onSelect,
  onNegotiate,
  negotiatingId,
}: CandidateCardProps) {
  const isSanitized = (candidate.sanitizedFlags?.length ?? 0) > 0;
  const isNegotiating = negotiatingId === candidate.id;

  return (
    <article
      className={cn(
        'flex flex-col justify-between rounded-3xl border p-5 transition-all duration-200',
        selected
          ? 'border-white/60 bg-[#1c1c20]/95 shadow-[0_0_28px_rgba(255,255,255,0.12)]'
          : 'border-white/15 bg-[#121214]/88 hover:border-white/30'
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-black">
              #{rank}
            </span>
            <Badge variant="default">{candidate.merchant}</Badge>
            <Badge variant="outline">{candidate.category}</Badge>
          </div>
          <span className="text-lg font-semibold tracking-tight text-white tabular-nums">
            {formatUsd(candidate.price)}
          </span>
        </div>

        <h4 className="mt-3 text-base font-semibold leading-snug text-white">
          {candidate.title}
        </h4>

        {isSanitized && (
          <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span>
              Prompt-injection text neutralized — untrusted product text treated as data only.
            </span>
          </div>
        )}

        <p className="mt-2 text-xs leading-relaxed text-[#a8a8ad]">
          {candidate.description}
        </p>

        {candidate.reason && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-[#28282a]/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8e8e8e]">
              Why this option
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#e5e5e5]">
              {candidate.reason}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#8e8e8e]">
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {candidate.deliveryEstimate ?? 'Standard shipping'}{' '}
              {candidate.deliveryEstimated && (
                <span className="rounded-full border border-white/15 bg-black/50 px-1.5 py-0.5 text-[10px] text-[#c8c8c8]">
                  Estimated
                </span>
              )}
            </span>
          </span>

          <a
            href={candidate.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#c8c8c8] hover:text-white underline-offset-4 hover:underline"
          >
            Retailer listing
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
        <Button
          type="button"
          size="sm"
          variant={selected ? 'primary' : 'outline'}
          onClick={() => onSelect(candidate)}
          className="flex-1"
        >
          {selected ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              In Active Cart
            </>
          ) : (
            'Select for Cart'
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          variant="darkPill"
          disabled={isNegotiating}
          onClick={() => onNegotiate(candidate)}
        >
          <MessageSquareMore className="h-3.5 w-3.5" aria-hidden="true" />
          {isNegotiating ? 'Negotiating...' : 'Negotiate'}
        </Button>
      </div>
    </article>
  );
}

