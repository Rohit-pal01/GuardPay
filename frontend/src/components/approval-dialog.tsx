'use client';

import React, { useEffect, useRef } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { Cart, Mandate, PolicyDecision } from '@/contracts';
import { Button } from '@/components/ui/button';
import { PolicyBadge } from '@/components/policy-badge';
import { formatUsd } from '@/lib/utils';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirmApprove: () => Promise<void>;
  cart: Cart | null;
  mandate: Mandate;
  decision: PolicyDecision | null;
  submitting: boolean;
}

export function ApprovalDialog({
  open,
  onClose,
  onConfirmApprove,
  cart,
  mandate,
  decision,
  submitting,
}: ApprovalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="closerequest"
      aria-labelledby="approval-dialog-title"
      onClose={handleClose}
      className="m-auto w-[min(540px,92vw)] rounded-3xl border border-white/20 bg-[#141416] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.75)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="approval-dialog-title" className="text-lg font-semibold text-white">
              Human Spending Approval
            </h2>
            <p className="text-xs text-[#8e8e8e]">
              Required before unlocking server-side PayPal order creation
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close approval dialog"
          onClick={handleClose}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8e8e8e] transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {cart && (
        <div className="mt-5 space-y-4">
          <PolicyBadge decision={decision} />

          <div className="rounded-2xl border border-white/10 bg-black/50 p-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[#8e8e8e]">Item</span>
              <span className="text-right font-medium text-white">
                {cart.items[0]?.title}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#8e8e8e]">Merchant</span>
              <span className="text-white">{cart.items[0]?.merchant}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#8e8e8e]">Mandate Per-Purchase Cap</span>
              <span className="tabular-nums text-[#c8c8c8]">
                {formatUsd(mandate.maxPerPurchase)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[#8e8e8e]">Auto-Approve Limit</span>
              <span className="tabular-nums text-[#c8c8c8]">
                {formatUsd(mandate.autoApproveBelow)}
              </span>
            </div>
            <div className="border-t border-white/10 pt-2.5 flex justify-between gap-3 text-base font-semibold">
              <span>Total to Authorize</span>
              <span className="tabular-nums text-white">{formatUsd(cart.total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="darkPill"
          autoFocus
          onClick={handleClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={submitting || !cart}
          onClick={onConfirmApprove}
        >
          {submitting ? 'Recording Approval...' : 'Approve & Unlock PayPal'}
        </Button>
      </div>
    </dialog>
  );
}

