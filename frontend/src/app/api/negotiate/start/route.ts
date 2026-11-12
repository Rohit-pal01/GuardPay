import { NextRequest, NextResponse } from "next/server";
import { StartNegotiateRequestSchema } from "@/contracts/api";
import { getMandate } from "@/lib/db/mandate-repo";
import { appendAuditEvent, getSessionSpent } from "@/lib/db/audit-repo";
import { saveCart } from "@/lib/db/cart-repo";
import { getMockCandidates } from "@/lib/search/mock";
import { runNegotiationLoop } from "@/lib/negotiation/loop";
import { buildCartTool } from "@/lib/agent/tools";
import { AgentEvent } from "@/contracts/events";
import { evaluatePolicy } from "@/lib/policy/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = StartNegotiateRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { candidateId, mandateId, sessionId } = parsed.data;
    const mandate = getMandate(mandateId);

    if (!mandate) {
      return NextResponse.json(
        { error: `Mandate "${mandateId}" not found` },
        { status: 404 }
      );
    }

    // Locate candidate product
    const candidates = getMockCandidates();
    const candidate = candidates.find((c) => c.id === candidateId) || candidates[0];

    const wantsJson = req.headers.get("accept")?.includes("application/json") &&
                      !req.headers.get("accept")?.includes("text/event-stream");

    if (wantsJson) {
      const events: AgentEvent[] = [];
      const loop = runNegotiationLoop({ candidate, mandate, sessionId });
      let negotiation;

      while (true) {
        const step = await loop.next();
        if (step.done) {
          negotiation = step.value;
          break;
        }
        events.push(step.value);
        appendAuditEvent(step.value);
      }

      // If settled, update candidate price and build cart
      let cart;
      if (negotiation.status === "settled" && negotiation.finalPrice) {
        const discountedCandidate = {
          ...candidate,
          price: negotiation.finalPrice,
        };
        cart = buildCartTool({ candidate: discountedCandidate, mandateId: mandate.id, sessionId });
        cart.status = "negotiated";
        saveCart(cart);
        const decision = evaluatePolicy(cart, mandate, {
          sessionSpentTotal: getSessionSpent(sessionId),
        });
        const settlementEvent = createSettlementEvent(sessionId, negotiation.finalPrice, cart, decision);
        events.push(settlementEvent);
        appendAuditEvent(settlementEvent);
      }

      return NextResponse.json({
        success: true,
        negotiation,
        cart,
        events,
      });
    }

    // SSE Stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const loop = runNegotiationLoop({ candidate, mandate, sessionId });
          let settledMessage: string | undefined;

          while (true) {
            const step = await loop.next();
            if (step.done) {
              const negotiation = step.value;
              if (negotiation.status === "settled" && negotiation.finalPrice) {
                const discountedCandidate = {
                  ...candidate,
                  price: negotiation.finalPrice,
                };
                const cart = buildCartTool({ candidate: discountedCandidate, mandateId: mandate.id, sessionId });
                cart.status = "negotiated";
                saveCart(cart);
                const decision = evaluatePolicy(cart, mandate, {
                  sessionSpentTotal: getSessionSpent(sessionId),
                });
                const settlementEvent = createSettlementEvent(
                  sessionId,
                  negotiation.finalPrice,
                  cart,
                  decision,
                  settledMessage,
                );
                appendAuditEvent(settlementEvent);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(settlementEvent)}\n\n`));
              }
              break;
            }

            const event = step.value;
            if (event.type === "negotiation_settled") {
              settledMessage = event.message;
              continue;
            }
            appendAuditEvent(event);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Negotiation failed';
          const errorEvt: AgentEvent = {
            id: `err_${Date.now()}`,
            sessionId: sessionId || "unknown",
            type: "error",
            message: msg,
            payload: {},
            timestamp: new Date().toISOString(),
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvt)}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json(
      { error: "Server error", message: msg },
      { status: 500 }
    );
  }
}

function createSettlementEvent(
  sessionId: string | undefined,
  finalPrice: number,
  cart: ReturnType<typeof buildCartTool>,
  decision: ReturnType<typeof evaluatePolicy>,
  message?: string,
): AgentEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId: sessionId || "session-default",
    type: "negotiation_settled",
    message: message || `Negotiation settled at $${finalPrice.toFixed(2)}.`,
    data: { cart, decision, finalPrice },
    timestamp: new Date().toISOString(),
  };
}
