import { type NextRequest, NextResponse } from 'next/server';
import { CartApproveRequestSchema, CartApproveResponseSchema } from '@/contracts/api';
import { appendAuditEvent, getSessionSpent } from '@/lib/db/audit-repo';
import { getCart, updateCartApproval } from '@/lib/db/cart-repo';
import { getActiveMandate, getMandate } from '@/lib/db/mandate-repo';
import { evaluatePolicy } from '@/lib/policy/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = CartApproveRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { cartId } = parsed.data;
    const cart = getCart(cartId);

    if (!cart) {
      return NextResponse.json({ error: `Cart ${cartId} not found` }, { status: 404 });
    }

    // Record authoritative approval in database (FR-A2-25 & Requirement 3)
    const updated = updateCartApproval(cartId, true);

    const mandate = getMandate(cart.mandateId) || getActiveMandate();
    const decision = evaluatePolicy(updated || cart, mandate, {
      sessionSpentTotal: getSessionSpent(cart.sessionId),
    });

    appendAuditEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: cart.sessionId,
      type: 'approved',
      timestamp: new Date().toISOString(),
      message: `Human approved cart ${cart.id} ($${cart.total.toFixed(2)}).`,
      data: { cartId: cart.id, total: cart.total },
      mandateId: cart.mandateId,
      verdict: 'allow',
    });

    const response = CartApproveResponseSchema.parse({ approved: true });
    return NextResponse.json({ ...response, cart: updated, decision });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
