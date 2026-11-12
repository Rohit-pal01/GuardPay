import { NextRequest, NextResponse } from "next/server";
import { ApproveCartRequestSchema } from "@/contracts/api.js";
import { getCart, updateCartStatus } from "@/lib/db/cart-repo.js";
import { appendAuditEvent } from "@/lib/db/audit-repo.js";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = ApproveCartRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { cartId } = parsed.data;
    const cart = getCart(cartId);

    if (!cart) {
      return NextResponse.json({ error: `Cart ${cartId} not found` }, { status: 404 });
    }

    const updated = updateCartStatus(cartId, "approved");

    appendAuditEvent({
      id: `evt_${Date.now()}`,
      sessionId: `session_${cart.mandateId}`,
      type: "approved",
      message: `User manually approved Cart ${cartId} ($${cart.total.toFixed(2)}) for PayPal sandbox checkout.`,
      payload: { cartId, total: cart.total },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ approved: true, cart: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

