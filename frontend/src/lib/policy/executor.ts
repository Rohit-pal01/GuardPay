import type { Cart } from '@/contracts/cart';
import type { PaymentOrder } from '@/contracts/payment-order';
import type { PolicyDecision } from '@/contracts/policy-decision';
import { appendAuditEvent, getSessionSpent } from '@/lib/db/audit-repo';
import { getCart } from '@/lib/db/cart-repo';
import { getActiveMandate, getMandate } from '@/lib/db/mandate-repo';
import { getOrder, saveOrder } from '@/lib/db/order-repo';
import { capturePayPalOrder, createPayPalOrder } from '@/lib/paypal';
import { evaluatePolicy } from './engine';

export interface ExecuteOrderCreateResult {
  paypalOrderId: string;
  order: PaymentOrder;
  decision: PolicyDecision;
}

/**
 * Server-side Executor — The authoritative safety gate (FR-A2-18 through FR-A2-23).
 *
 * Security Guarantee (Requirement 3):
 * NEVER trust cart.approved supplied by the browser or the agent.
 * Only trust the approval saved in the database by /api/cart/approve.
 */
export async function executeCreateOrder(params: {
  cartId: string;
  untrustedCart?: Cart;
}): Promise<ExecuteOrderCreateResult> {
  // Always fetch the authoritative cart record from the database.
  // Never trust untrustedCart.approved from client or agent.
  const trustedCart = await getCart(params.cartId);
  if (!trustedCart) {
    const errorMsg = `Cart ${params.cartId} not found in database.`;
    await appendAuditEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: params.untrustedCart?.sessionId || 'unknown',
      type: 'error',
      timestamp: new Date().toISOString(),
      message: errorMsg,
      data: { cartId: params.cartId },
    });
    throw new Error(errorMsg);
  }

  const mandate = (await getMandate(trustedCart.mandateId)) || await getActiveMandate();
  const sessionSpentTotal = await getSessionSpent(trustedCart.sessionId);

  // Evaluate deterministic policy rules
  const decision = evaluatePolicy(trustedCart, mandate, { sessionSpentTotal });

  await appendAuditEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId: trustedCart.sessionId,
    type: 'policy_checked',
    timestamp: new Date().toISOString(),
    message: `Policy Engine evaluated cart ${trustedCart.id}: ${decision.verdict.toUpperCase()}`,
    data: { cartId: trustedCart.id, decision },
    mandateId: mandate.id,
    verdict: decision.verdict,
  });

  // If hard policy denies, reject purchase
  if (decision.verdict === 'deny') {
    await appendAuditEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: trustedCart.sessionId,
      type: 'blocked',
      timestamp: new Date().toISOString(),
      message: `Order creation rejected by Policy Engine: ${decision.reasons.join('; ')}`,
      data: { cartId: trustedCart.id, reasons: decision.reasons, ruleIds: decision.ruleIds },
      mandateId: mandate.id,
      verdict: 'deny',
    });
    throw new Error(`Policy Engine Denied Purchase: ${decision.reasons.join('; ')}`);
  }

  // If human approval is required, verify approval stored in the database
  if (decision.verdict === 'needs_approval') {
    if (!trustedCart.approved) {
      await appendAuditEvent({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        sessionId: trustedCart.sessionId,
        type: 'awaiting_approval',
        timestamp: new Date().toISOString(),
        message: `Cart ${trustedCart.id} requires recorded human approval before order creation.`,
        data: { cartId: trustedCart.id },
        mandateId: mandate.id,
        verdict: 'needs_approval',
      });
      throw new Error(`Approval Required: Cart ${trustedCart.id} has not been approved via /api/cart/approve.`);
    }
  }

  // Create PayPal order
  const { paypalOrderId, order } = await createPayPalOrder(trustedCart);
  await saveOrder(order);

  await appendAuditEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId: trustedCart.sessionId,
    type: 'order_created',
    timestamp: new Date().toISOString(),
    message: `Created PayPal Sandbox order ${paypalOrderId} for $${trustedCart.total.toFixed(2)}.`,
    data: { cartId: trustedCart.id, paypalOrderId, total: trustedCart.total },
    mandateId: mandate.id,
    verdict: 'allow',
  });

  return { paypalOrderId, order, decision };
}

/**
 * Server-side Executor Capture — Re-checks price drift and parity before capture (FR-A2-20).
 */
export async function executeCaptureOrder(params: {
  paypalOrderId: string;
}): Promise<PaymentOrder> {
  const order = await getOrder(params.paypalOrderId);
  if (!order) {
    const errorMsg = `PaymentOrder ${params.paypalOrderId} not found.`;
    throw new Error(errorMsg);
  }

  const trustedCart = await getCart(order.cartId);
  if (!trustedCart) {
    throw new Error(`Cart ${order.cartId} not found in database.`);
  }

  const mandate = (await getMandate(trustedCart.mandateId)) || await getActiveMandate();
  const sessionSpentTotal = await getSessionSpent(trustedCart.sessionId);

  // FR-A2-20: Re-check price drift and parity at capture time
  const captureDecision = evaluatePolicy(trustedCart, mandate, {
    sessionSpentTotal,
    originalCartTotal: order.amount,
    paypalOrderAmount: order.amount,
  });

  if (captureDecision.verdict === 'deny') {
    await appendAuditEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: trustedCart.sessionId,
      type: 'blocked',
      timestamp: new Date().toISOString(),
      message: `Capture blocked: ${captureDecision.reasons.join('; ')}`,
      data: { paypalOrderId: order.paypalOrderId, decision: captureDecision },
      mandateId: mandate.id,
      verdict: 'deny',
    });
    throw new Error(`Order capture blocked by Policy Engine: ${captureDecision.reasons.join('; ')}`);
  }

  const capturedOrder = await capturePayPalOrder(params.paypalOrderId, trustedCart);
  await saveOrder(capturedOrder);

  await appendAuditEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId: trustedCart.sessionId,
    type: 'payment_captured',
    timestamp: new Date().toISOString(),
    message: `PayPal Sandbox payment captured (${capturedOrder.captureId}) for $${capturedOrder.amount.toFixed(2)}.`,
    data: {
      paypalOrderId: capturedOrder.paypalOrderId,
      captureId: capturedOrder.captureId,
      amount: capturedOrder.amount,
    },
    mandateId: mandate.id,
    verdict: 'allow',
  });

  return capturedOrder;
}
