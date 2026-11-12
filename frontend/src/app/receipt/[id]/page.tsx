'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import type { PaymentOrder } from '@/contracts';
import { fetchOrderReceipt } from '@/lib/api-client';
import { VideoBackground } from '@/components/layout/video-background';
import { SiteHeader } from '@/components/layout/site-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatUsd } from '@/lib/utils';

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(params.id);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderReceipt(decodedId)
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [decodedId]);

  return (
    <main className="relative min-h-screen bg-black text-white">
      <VideoBackground dimmed />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[820px] flex-col gap-8 px-[clamp(14px,3vw,32px)] py-[clamp(16px,2.4vh,28px)]">
        <SiteHeader />

        <div className="space-y-6 pb-16">
          <Link
            href="/agent"
            className="inline-flex items-center gap-1.5 text-xs text-[#8e8e8e] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Agent Shopping Flow
          </Link>

          {loading ? (
            <Card className="border-white/15 bg-[#121214]/90">
              <CardContent className="p-8 text-xs text-[#8e8e8e]">
                Loading PayPal Sandbox receipt...
              </CardContent>
            </Card>
          ) : !order ? (
            <Card className="border-white/15 bg-[#121214]/90">
              <CardHeader>
                <CardTitle className="text-xl">Receipt Not Found</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-[#c8c8c8]">
                <p>
                  No PayPal Sandbox order found for <code>{decodedId}</code>.
                </p>
                <Link
                  href="/agent"
                  className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black"
                >
                  Start New Purchase Flow
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-emerald-400/35 bg-[#121214]/92">
              <CardHeader className="space-y-3 border-b border-white/10 pb-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge variant="allow">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {order.status} &bull; PayPal Sandbox
                  </Badge>
                  <Badge variant="default">Mandate: {order.mandateId}</Badge>
                </div>
                <h1 className="font-display text-3xl text-white">Verified Receipt</h1>
                <p className="text-xs text-[#8e8e8e]">
                  Sandbox settlement of a real product selection with our sandbox business account as merchant of record.
                </p>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 text-xs sm:grid-cols-2">
                  <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black/45 p-4">
                    <p className="text-[#8e8e8e]">PayPal Order ID</p>
                    <p className="font-mono text-sm text-white">{order.paypalOrderId}</p>
                  </div>
                  <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black/45 p-4">
                    <p className="text-[#8e8e8e]">PayPal Capture ID</p>
                    <p className="font-mono text-sm text-white">
                      {order.captureId ?? 'Pending capture'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-white">Line Items</h2>
                  {order.items.map((item) => (
                    <div
                      key={item.candidateId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/45 p-4 text-xs"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-[#8e8e8e]">
                          {item.merchant} &bull; {item.category} &bull; Qty {item.quantity}
                        </p>
                        <a
                          href={item.retailerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-white/80 underline underline-offset-4 hover:text-white"
                        >
                          Retailer product link
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-white">
                        {formatUsd(item.unitPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-[#1a1a1d]/80 p-4 text-xs">
                  <div className="flex justify-between text-[#a8a8ad]">
                    <span>Item total</span>
                    <span className="tabular-nums">{formatUsd(order.breakdown.itemTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#a8a8ad]">
                    <span>Tax total</span>
                    <span className="tabular-nums">{formatUsd(order.breakdown.taxTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#a8a8ad]">
                    <span>Shipping</span>
                    <span className="tabular-nums">
                      {order.breakdown.shipping === 0
                        ? 'FREE'
                        : formatUsd(order.breakdown.shipping)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold text-white">
                    <span>Captured Total ({order.currency})</span>
                    <span className="tabular-nums">{formatUsd(order.amount)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-300">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Re-verified against Mandate at capture time
                  </div>
                  <Link
                    href={`/audit?sessionId=${encodeURIComponent(order.sessionId)}`}
                    className="rounded-full border border-white/25 px-4 py-2 text-xs font-medium text-white hover:bg-white/10"
                  >
                    View Session Audit Trail
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
