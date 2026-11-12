'use client';

import React, { useState } from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import type { Cart, PaymentOrder, PolicyDecision } from '@/contracts';
import { captureOrderRequest, createOrderRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { formatUsd } from '@/lib/utils';

interface PayPalButtonProps {
  cart: Cart;
  decision: PolicyDecision | null;
  onOrderCaptured: (order: PaymentOrder) => void;
  onError: (message: string) => void;
}

export function PayPalButton({
  cart,
  decision,
  onOrderCaptured,
  onError,
}: PayPalButtonProps) {
  const [busy, setBusy] = useState(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const isAllowed = decision?.verdict === 'allow';

  if (!isAllowed) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-black/50 px-4 py-3 text-xs text-[#8e8e8e]">
        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>
          PayPal checkout locked until Policy Engine returns <strong>ALLOW</strong>.
        </span>
      </div>
    );
  }

  const handleMockSandboxSettlement = async () => {
    try {
      setBusy(true);
      setStatusLabel('Creating PayPal Sandbox order...');
      const paypalOrderId = await createOrderRequest(cart);

      setStatusLabel(`Capturing ${paypalOrderId}...`);
      const capturedOrder = await captureOrderRequest(paypalOrderId);

      setStatusLabel(null);
      onOrderCaptured(capturedOrder);
    } catch (err) {
      setStatusLabel(null);
      onError(err instanceof Error ? err.message : 'PayPal sandbox checkout failed');
    } finally {
      setBusy(false);
    }
  };

  if (!clientId) {
    return (
      <div className="space-y-2.5">
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={busy}
          onClick={handleMockSandboxSettlement}
          className="w-full"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {statusLabel ?? 'Settling in PayPal Sandbox...'}
            </>
          ) : (
            <>
              <i className="fa-brands fa-paypal text-base" aria-hidden="true" />
              Pay {formatUsd(cart.total)} via PayPal Sandbox
            </>
          )}
        </Button>
        <p className="text-center text-[11px] text-[#8e8e8e]">
          Wired to <code>/api/orders/create</code> &amp; <code>/api/orders/capture</code> with UI mock fallback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-2xl bg-white p-3">
        <PayPalScriptProvider
          options={{
            clientId,
            currency: 'USD',
            intent: 'capture',
          }}
        >
          <PayPalButtons
            style={{ layout: 'vertical', shape: 'pill', label: 'pay' }}
            createOrder={async () => {
              try {
                return await createOrderRequest(cart);
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Order creation failed');
                throw err;
              }
            }}
            onApprove={async (data) => {
              try {
                setBusy(true);
                const captured = await captureOrderRequest(data.orderID);
                onOrderCaptured(captured);
              } catch (err) {
                onError(err instanceof Error ? err.message : 'Capture failed');
              } finally {
                setBusy(false);
              }
            }}
            onError={(err) => {
              onError(String(err));
            }}
          />
        </PayPalScriptProvider>
      </div>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#8e8e8e]">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" aria-hidden="true" />
        Live PayPal Sandbox JS SDK &bull; Merchant-of-record sandbox settlement
      </p>
    </div>
  );
}
