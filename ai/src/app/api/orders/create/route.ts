import { NextRequest, NextResponse } from "next/server";
import { CreateOrderRequestSchema } from "@/contracts/api.js";
import { getCart } from "@/lib/db/cart-repo.js";
import { getMandate } from "@/lib/db/mandate-repo.js";
import { evaluatePolicy } from "@/lib/policy/engine.js";
import { createPayPalOrder } from "@/lib/paypal/orders.js";
import { appendAuditEvent } from "@/lib/db/audit-repo.js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = CreateOrderRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { cartId } = parsed.data;
    const cart = getCart(cartId);

    if (!cart) {
      return NextResponse.json({ error: `Cart ${cartId} not found` }, { status: 404 });
    }

    const mandate = getMandate(cart.mandateId);
    if (!mandate) {
      return NextResponse.json({ error: `Mandate ${cart.mandateId} not found` }, { status: 404 });
    }

    // POLICY GATE: Evaluate deterministic policy rules
    const decision = evaluatePolicy(cart, mandate);

    if (decision.verdict === "deny") {
      appendAuditEvent({
        id: `evt_${Date.now()}`,
        sessionId: `session_${cart.mandateId}`,
        type: "blocked",
        message: `Order creation rejected by Policy Engine: ${decision.reasons.join("; ")}`,
        payload: { cartId, reasons: decision.reasons, ruleIds: decision.ruleIds },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        { error: "Policy Engine Denied Purchase", decision },
        { status: 403 }
      );
    }

    if (decision.verdict === "needs_approval" && cart.status !== "approved") {
      return NextResponse.json(
        {
          error: "Approval Required",
          message: "Cart requires human approval before PayPal order creation.",
          decision,
        },
        { status: 403 }
      );
    }

    // Proceed to create PayPal order
    const { paypalOrderId } = await createPayPalOrder(cart);

    appendAuditEvent({
      id: `evt_${Date.now()}`,
      sessionId: `session_${cart.mandateId}`,
      type: "order_created",
      message: `Created PayPal sandbox order ${paypalOrderId} for $${cart.total.toFixed(2)}.`,
      payload: { cartId, paypalOrderId, total: cart.total },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ paypalOrderId, decision });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

