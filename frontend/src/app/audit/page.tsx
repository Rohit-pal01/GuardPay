'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { AuditEvent } from '@/contracts';
import { fetchAuditEvents } from '@/lib/api-client';
import { VideoBackground } from '@/components/layout/video-background';
import { SiteHeader } from '@/components/layout/site-header';
import { AuditTimeline } from '@/components/audit-timeline';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function AuditPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId') ?? undefined;
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    fetchAuditEvents(sessionId).then((loaded) => {
      setEvents([...loaded].reverse());
    });
  }, [sessionId]);

  const blockedCount = events.filter((e) => e.type === 'blocked').length;
  const capturedCount = events.filter((e) => e.type === 'payment_captured').length;

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Agent Shopping Flow
          </Link>
          <h1 className="font-display mt-2 text-3xl text-white sm:text-4xl">Audit Log</h1>
          <p className="mt-1 text-sm text-[#c8c8c8]">
            Chronological trace of every agent decision, Policy Engine check, negotiation turn, and PayPal Sandbox capture.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sessionId && <Badge variant="outline">Session: {sessionId}</Badge>}
          <Badge variant="default">{events.length} Total Events</Badge>
          <Badge variant="deny">{blockedCount} Blocked</Badge>
          <Badge variant="allow">{capturedCount} Captured</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <AuditTimeline events={events} title="Chronological Event Stream" />
        </div>

        <div className="lg:col-span-5">
          <Card className="border-white/15 bg-[#121214]/90">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <CardTitle className="text-base">Design Rules Verified</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-[#c8c8c8]">
              <div className="rounded-2xl border border-white/10 bg-black/45 p-3.5">
                <p className="font-semibold text-white">1. LLM proposes, code disposes</p>
                <p className="mt-1">
                  Only the server-side executor can create or capture PayPal orders, and only after deterministic Policy Engine approval.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/45 p-3.5">
                <p className="font-semibold text-white">2. Product text is untrusted</p>
                <p className="mt-1">
                  External titles and descriptions are sanitized before ranking and never executed as instructions.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/45 p-3.5">
                <p className="font-semibold text-white">3. Every step emits an AgentEvent</p>
                <p className="mt-1">
                  SSE stream events are simultaneously persisted to the audit log for post-hoc verification.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  return (
    <main className="relative min-h-screen bg-black text-white">
      <VideoBackground dimmed />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1040px] flex-col gap-8 px-[clamp(14px,3vw,32px)] py-[clamp(16px,2.4vh,28px)]">
        <SiteHeader />
        <Suspense
          fallback={
            <div className="rounded-3xl border border-white/15 bg-[#121214]/80 p-8 text-xs text-[#8e8e8e]">
              Loading audit stream...
            </div>
          }
        >
          <AuditPageContent />
        </Suspense>
      </div>
    </main>
  );
}
