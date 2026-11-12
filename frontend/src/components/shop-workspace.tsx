'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Settings2 } from 'lucide-react';
import type {
  AgentEvent,
  Candidate,
  Cart,
  Mandate,
  NegotiationTurn,
  ParsedIntent,
  PaymentOrder,
  PolicyDecision,
} from '@/contracts';
import {
  DEFAULT_MANDATE,
  approveCartRequest,
  evaluateCartForUi,
  fetchActiveMandate,
  runAgentStream,
  startNegotiationStream,
} from '@/lib/api-client';
import { RequestBox } from '@/components/request-box';
import { CandidateCard } from '@/components/candidate-card';
import { CartPanel } from '@/components/cart-panel';
import { AuditTimeline } from '@/components/audit-timeline';
import { ApprovalDialog } from '@/components/approval-dialog';
import { NegotiationChat } from '@/components/negotiation-chat';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUsd } from '@/lib/utils';

export function ShopWorkspace() {
  const [mandate, setMandate] = useState<Mandate>(DEFAULT_MANDATE);
  const [sessionId, setSessionId] = useState('sess-demo-01');
  const [sessionSpentTotal, setSessionSpentTotal] = useState(0);

  const [requestText, setRequestText] = useState(
    'noise-cancelling headphones under $250 by Friday'
  );
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cartsByCandidateId, setCartsByCandidateId] = useState<Record<string, Cart>>({});
  const [activeCart, setActiveCart] = useState<Cart | null>(null);
  const [decision, setDecision] = useState<PolicyDecision | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvingCart, setApprovingCart] = useState(false);
  const [capturedOrder, setCapturedOrder] = useState<PaymentOrder | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [negotiatingCandidate, setNegotiatingCandidate] = useState<Candidate | null>(null);
  const [negotiationTurns, setNegotiationTurns] = useState<NegotiationTurn[]>([]);
  const [isNegotiating, setIsNegotiating] = useState(false);
  const [agreedPrice, setAgreedPrice] = useState<number | null>(null);

  useEffect(() => {
    fetchActiveMandate().then(setMandate);
  }, []);

  const resetFlow = () => {
    setSessionId(`sess-${Math.random().toString(36).slice(2, 8)}`);
    setParsedIntent(null);
    setCandidates([]);
    setCartsByCandidateId({});
    setActiveCart(null);
    setDecision(null);
    setEvents([]);
    setCapturedOrder(null);
    setCheckoutError(null);
    setNegotiatingCandidate(null);
    setNegotiationTurns([]);
    setAgreedPrice(null);
  };

  const handleRunAgent = async (queryOverride?: string) => {
    const activeQuery = (queryOverride ?? requestText).trim();
    if (!activeQuery) return;

    setIsRunningAgent(true);
    setParsedIntent(null);
    setCandidates([]);
    setCartsByCandidateId({});
    setActiveCart(null);
    setDecision(null);
    setEvents([]);
    setCapturedOrder(null);
    setCheckoutError(null);
    setNegotiatingCandidate(null);
    setNegotiationTurns([]);
    setAgreedPrice(null);

    try {
      const latestMandate = await fetchActiveMandate();
      setMandate(latestMandate);

      await runAgentStream(
        {
          request: activeQuery,
          mandate: latestMandate,
          sessionId,
          sessionSpentTotal,
        },
        (event) => {
          setEvents((prev) => [...prev, event]);

          if (event.type === 'intent_parsed' && event.data?.intent) {
            setParsedIntent(event.data.intent as ParsedIntent);
          }
          if (event.type === 'ranked' && Array.isArray(event.data?.candidates)) {
            setCandidates(event.data.candidates as Candidate[]);
          }
          if (event.type === 'cart_ready' && event.data?.cart) {
            setActiveCart(event.data.cart as Cart);
            if (event.data.cartsByCandidateId) {
              setCartsByCandidateId(event.data.cartsByCandidateId as Record<string, Cart>);
            }
          }
          if (
            (event.type === 'policy_checked' ||
              event.type === 'awaiting_approval' ||
              event.type === 'blocked' ||
              event.type === 'approved') &&
            event.data?.decision
          ) {
            setDecision(event.data.decision as PolicyDecision);
          }
        }
      );
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Agent run failed');
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleSelectCandidate = (candidate: Candidate) => {
    const mappedCart = cartsByCandidateId[candidate.id];
    if (!mappedCart) return;
    setActiveCart(mappedCart);
    setCapturedOrder(null);
    setCheckoutError(null);

    const nextDecision = evaluateCartForUi(mandate, mappedCart, sessionSpentTotal);
    setDecision(nextDecision);

    setEvents((prev) => [
      ...prev,
      {
        id: `evt-sel-${Date.now()}`,
        sessionId,
        type: 'policy_checked',
        timestamp: new Date().toISOString(),
        message: `Selected "${candidate.title}" (${formatUsd(mappedCart.total)}). Policy Engine verdict: ${nextDecision.verdict.toUpperCase()}.`,
        data: { cartId: mappedCart.id, decision: nextDecision },
      },
    ]);
  };

  const handleNegotiate = async (candidate: Candidate) => {
    setNegotiatingCandidate(candidate);
    setNegotiationTurns([]);
    setAgreedPrice(null);
    setIsNegotiating(true);
    setCapturedOrder(null);
    setCheckoutError(null);

    try {
      await startNegotiationStream(
        {
          candidate,
          mandate,
          sessionId,
          sessionSpentTotal,
        },
        (event) => {
          setEvents((prev) => [...prev, event]);

          if (event.type === 'negotiation_turn' && event.data?.turn) {
            setNegotiationTurns((prev) => [...prev, event.data?.turn as NegotiationTurn]);
          }

          if (event.type === 'negotiation_settled' && event.data?.cart) {
            const settledCart = event.data.cart as Cart;
            const settledDecision = event.data.decision as PolicyDecision;
            setAgreedPrice(settledCart.items[0]?.unitPrice ?? null);
            setActiveCart(settledCart);
            setCartsByCandidateId((prev) => ({
              ...prev,
              [candidate.id]: settledCart,
            }));
            setDecision(settledDecision);
          }
        }
      );
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Negotiation failed');
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!activeCart) return;
    setApprovingCart(true);
    setCheckoutError(null);

    try {
      const { cart: approvedCart, decision: postDecision } = await approveCartRequest(
        activeCart,
        mandate,
        sessionSpentTotal
      );
      setActiveCart(approvedCart);
      setDecision(postDecision);
      setCartsByCandidateId((prev) => ({
        ...prev,
        [approvedCart.items[0].candidateId]: approvedCart,
      }));
      setEvents((prev) => [
        ...prev,
        {
          id: `evt-app-${Date.now()}`,
          sessionId,
          type: 'approved',
          timestamp: new Date().toISOString(),
          message: `Human approved cart ${approvedCart.id} (${formatUsd(approvedCart.total)}). PayPal checkout unlocked.`,
        },
      ]);
      setApprovalOpen(false);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Approval failed');
      setApprovalOpen(false);
    } finally {
      setApprovingCart(false);
    }
  };

  const handleOrderCaptured = (order: PaymentOrder) => {
    setCapturedOrder(order);
    setSessionSpentTotal((prev) => Math.round((prev + order.amount) * 100) / 100);
    setEvents((prev) => [
      ...prev,
      {
        id: `evt-cap-${Date.now()}`,
        sessionId,
        type: 'payment_captured',
        timestamp: new Date().toISOString(),
        message: `PayPal Sandbox payment captured (${order.captureId ?? order.paypalOrderId}) for ${formatUsd(order.amount)}.`,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/12 bg-[#1a1a1d]/85 px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="font-display text-sm text-white">MANDATE</span>
          <Badge variant="allow">Active: {mandate.id}</Badge>
          <Badge variant="default">Per-Order &le; {formatUsd(mandate.maxPerPurchase)}</Badge>
          <Badge variant="default">
            Session: {formatUsd(sessionSpentTotal)} / {formatUsd(mandate.maxSessionTotal)}
          </Badge>
          <Badge variant="outline">Auto &le; {formatUsd(mandate.autoApproveBelow)}</Badge>
          <Badge variant="outline">
            Blocked: {mandate.blockedMerchants.join(', ') || 'None'}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/mandate"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3.5 text-xs font-medium text-white transition-colors hover:bg-white/10"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            Edit Mandate
          </Link>
          <Button type="button" variant="ghost" size="sm" onClick={resetFlow}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </Button>
        </div>
      </div>

      <RequestBox
        requestText={requestText}
        onRequestTextChange={setRequestText}
        onSubmit={handleRunAgent}
        isRunning={isRunningAgent}
        mandate={mandate}
        parsedIntent={parsedIntent}
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-display text-lg text-white" aria-hidden="true">
                  02
                </span>
                <h2 className="text-lg font-semibold text-white">Ranked Top 3 Candidates</h2>
              </div>
              {candidates.length > 0 && (
                <span className="text-xs text-[#8e8e8e]">Channel3 + deterministic filter</span>
              )}
            </div>

            {candidates.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/15 bg-[#121214]/75 p-10 text-center text-xs text-[#8e8e8e]">
                Submit a shopping request or select a demo scenario above to see the ranked top 3 options with plain-English explanations.
              </div>
            ) : (
              <div className="grid gap-4">
                {candidates.map((cand, idx) => (
                  <CandidateCard
                    key={cand.id}
                    candidate={cand}
                    rank={idx + 1}
                    selected={activeCart?.items[0]?.candidateId === cand.id}
                    onSelect={handleSelectCandidate}
                    onNegotiate={handleNegotiate}
                    negotiatingId={isNegotiating ? negotiatingCandidate?.id : null}
                  />
                ))}
              </div>
            )}
          </div>

          <NegotiationChat
            candidate={negotiatingCandidate}
            mandate={mandate}
            turns={negotiationTurns}
            isRunning={isNegotiating}
            agreedPrice={agreedPrice}
            onDismiss={() => {
              setNegotiatingCandidate(null);
              setNegotiationTurns([]);
            }}
          />
        </div>

        <div className="space-y-6 lg:col-span-5">
          <CartPanel
            cart={activeCart}
            decision={decision}
            capturedOrder={capturedOrder}
            onOpenApproval={() => setApprovalOpen(true)}
            onOrderCaptured={handleOrderCaptured}
            onCheckoutError={setCheckoutError}
            checkoutError={checkoutError}
          />

          <AuditTimeline events={events} isLive={isRunningAgent || isNegotiating} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[11px] text-[#8e8e8e]">
        <p>
          Sandbox settlement of a real product selection: PayPal orders use our sandbox business account as merchant of record and include product details and retailer URLs in line items.
        </p>
        <Link
          href={`/audit?sessionId=${encodeURIComponent(sessionId)}`}
          className="text-white/80 underline underline-offset-4 hover:text-white"
        >
          Open Audit Log &rarr;
        </Link>
      </div>

      <ApprovalDialog
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        onConfirmApprove={handleConfirmApprove}
        cart={activeCart}
        mandate={mandate}
        decision={decision}
        submitting={approvingCart}
      />
    </div>
  );
}

