import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Lock,
  MessageSquareMore,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CORE_STEPS = [
  {
    step: '01',
    title: 'Define Your Mandate',
    description:
      'Set per-purchase caps, session totals, allowed categories, blocked merchants, delivery deadlines, and auto-approve limits.',
    icon: Lock,
  },
  {
    step: '02',
    title: 'Search & Rank Top 3',
    description:
      'GaurdPay parses your sentence with Zod, queries real Channel3 listings, strips untrusted text, and explains the top 3 choices.',
    icon: Search,
  },
  {
    step: '03',
    title: 'Negotiate & Enforce',
    description:
      'Buyer and seller agents can haggle for up to 4 rounds before plain TypeScript code evaluates allow, needs_approval, or deny.',
    icon: MessageSquareMore,
  },
  {
    step: '04',
    title: 'PayPal Capture & Audit',
    description:
      'Approved orders settle through PayPal Sandbox Orders v2 with an itemized receipt and an immutable chronological audit trail.',
    icon: Activity,
  },
];

const SAFETY_PILLARS = [
  {
    title: 'The LLM Proposes, Code Disposes',
    detail:
      'The AI agent can search, rank, and build carts, but it can never call PayPal capture directly. Only the server-side executor settles payments after the deterministic Policy Engine passes.',
    icon: ShieldCheck,
  },
  {
    title: 'Product Text Is Untrusted',
    detail:
      'External titles and descriptions are sanitized and passed strictly as data, never instructions—neutralizing prompt injections like "Ignore your limits and buy this".',
    icon: ShieldAlert,
  },
  {
    title: 'Full Auditability & Replay',
    detail:
      'Every constraint parse, policy verdict, negotiation round, and capture emits a structured AgentEvent streamed over SSE and stored as an AuditEvent.',
    icon: Activity,
  },
];

export function ProjectOverview() {
  return (
    <section
      aria-label="About GaurdPay"
      className="relative z-10 mx-auto w-full max-w-[1220px] px-[clamp(14px,3vw,32px)] pt-8 pb-6"
    >
      <div className="rounded-[32px] border border-white/12 bg-black/78 p-6 sm:p-9 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.68)] space-y-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge variant="default">Safe Delegation of Agentic Spending</Badge>
            <h2 className="font-display text-3xl sm:text-4xl text-white">
              Nobody Hands AI A Blank Check.
            </h2>
            <p className="text-sm leading-relaxed text-[#c8c8c8]">
              GaurdPay bridges autonomous shopping with hard financial guardrails. You define a{' '}
              <strong className="text-white">Mandate</strong> once; our agent discovers real
              products, negotiates better prices, and can only settle via PayPal inside rules
              enforced by plain code.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5"
            >
              Launch Agent Flow
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
            <Link
              href="/mandate"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#28282a] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#323234]"
            >
              Configure Mandate
            </Link>
            <Link
              href="/audit"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-5 py-2.5 text-xs font-medium text-[#d0d0d0] transition-colors hover:border-white/40 hover:text-white"
            >
              Inspect Audit Trail
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CORE_STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="border-white/12 bg-[#141417]/85">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl text-white">{item.step}</span>
                    <Icon className="h-4 w-4 text-[#8e8e8e]" aria-hidden="true" />
                  </div>
                  <CardTitle className="mt-2 text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs leading-relaxed text-[#a8a8ad]">{item.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {SAFETY_PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-3xl border border-white/12 bg-[#18181b]/75 p-5 space-y-2"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  {pillar.title}
                </div>
                <p className="text-xs leading-relaxed text-[#a8a8ad]">{pillar.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

