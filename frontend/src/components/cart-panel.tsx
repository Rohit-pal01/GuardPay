'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { Cart, PaymentOrder, PolicyDecision } from '@/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PolicyBadge } from '@/components/policy-badge';
import { PayPalButton } from '@/components/paypal-button';
import { formatUsd } from '@/lib/utils';

interface CartPanelProps {
  cart: Cart | null;
  decision: PolicyDecision | null;
  capturedOrder: PaymentOrder | null;
  onOpenApproval: () => void;
  onOrderCaptured: (order: PaymentOrder) => void;
  onCheckoutError: (message: string) => void;
  checkoutError: string | null;
}

export function CartPanel({
  cart,
  decision,
  capturedOrder,
  onOpenApproval,
  onOrderCaptured,
  onCheckoutError,
  checkoutError,
}: CartPanelProps) {
  return (
    <Card className="border-white/15 bg-[#121214]/90">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg text-white" aria-hidden="true">
            03
          </span>
          <CardTitle className="text-lg">Cart &amp; Policy Gate</CardTitle>
        </div>
        <ShoppingBag className="h-4 w-4 text-[#8e8e8e]" aria-hidden="true" />
      </CardHeader>

      <CardContent className="space-y-4">
        {!cart ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-black/35 p-6 text-center text-xs text-[#8e8e8e]">
            Run GaurdPay or select a ranked candidate to build a cart and evaluate your Mandate.
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {cart.items.map((item) => (
                <div
                  key={item.candidateId}
                  className="rounded-2xl border border-white/10 bg-black/45 p-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white leading-snug">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8e8e8e]">
                        <span>{item.merchant}</span>
                        <span>&bull;</span>
                        <span>{item.category}</span>
                        <span>&bull;</span>
                        <span>Qty {item.quantity}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                      {formatUsd(item.unitPrice)}
                    </span>
                  </div>

                  {cart.negotiatedFromPrice !== undefined &&
                    cart.negotiatedFromPrice > item.unitPrice && (
                      <div className="mt-2">
                        <Badge variant="allow">
                          Negotiated down from {formatUsd(cart.negotiatedFromPrice)} (saved{' '}
                          {formatUsd(cart.negotiatedFromPrice - item.unitPrice)})
                        </Badge>
                      </div>
                    )}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#1a1a1d]/75 p-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#a8a8ad]">
                <span>Item subtotal</span>
                <span className="tabular-nums">{formatUsd(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#a8a8ad]">
                <span>Estimated tax (8%)</span>
                <span className="tabular-nums">{formatUsd(cart.tax)}</span>
              </div>
              <div className="flex justify-between text-[#a8a8ad]">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {cart.shipping === 0 ? 'FREE' : formatUsd(cart.shipping)}
                </span>
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between text-sm font-semibold text-white">
                <span>Cart Total</span>
                <span className="tabular-nums">{formatUsd(cart.total)}</span>
              </div>
            </div>

            <PolicyBadge decision={decision} />

            {checkoutError && (
              <div
                role="alert"
                className="rounded-2xl border border-red-400/40 bg-red-500/12 px-4 py-3 text-xs text-red-200"
              >
                {checkoutError}
              </div>
            )}

            {capturedOrder ? (
              <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/12 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                  PayPal Sandbox Payment Captured
                </div>
                <div className="space-y-1 text-xs text-emerald-100/90">
                  <p>
                    Order ID: <code className="font-mono">{capturedOrder.paypalOrderId}</code>
                  </p>
                  {capturedOrder.captureId && (
                    <p>
                      Capture ID: <code className="font-mono">{capturedOrder.captureId}</code>
                    </p>
                  )}
                  <p>
                    Settled Amount:{' '}
                    <strong className="tabular-nums">{formatUsd(capturedOrder.amount)}</strong>
                  </p>
                </div>
                <Link
                  href={`/receipt/${encodeURIComponent(capturedOrder.paypalOrderId)}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-black transition-transform hover:-translate-y-0.5"
                >
                  Open Verified Receipt
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            ) : decision?.verdict === 'needs_approval' ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={onOpenApproval}
                className="w-full"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Review &amp; Approve Purchase
              </Button>
            ) : (
              <PayPalButton
                cart={cart}
                decision={decision}
                onOrderCaptured={onOrderCaptured}
                onError={onCheckoutError}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

