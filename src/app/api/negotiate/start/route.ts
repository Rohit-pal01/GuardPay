import { NextRequest, NextResponse } from "next/server";
import { StartNegotiateRequestSchema } from "@/contracts/api.js";
import { getMandate } from "@/lib/db/mandate-repo.js";
import { appendAuditEvent } from "@/lib/db/audit-repo.js";
import { saveCart } from "@/lib/db/cart-repo.js";
import { getMockCandidates } from "@/lib/search/mock.js";
import { runNegotiationLoop } from "@/lib/negotiation/loop.js";
import { buildCartTool } from "@/lib/agent/tools.js";
import { AgentEvent } from "@/contracts/events.js";

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
        cart = buildCartTool({ candidate: discountedCandidate, mandateId: mandate.id });
        cart.status = "negotiated";
        saveCart(cart);
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

          while (true) {
            const step = await loop.next();
            if (step.done) {
              const negotiation = step.value;
              if (negotiation.status === "settled" && negotiation.finalPrice) {
                const discountedCandidate = {
                  ...candidate,
                  price: negotiation.finalPrice,
                };
                const cart = buildCartTool({ candidate: discountedCandidate, mandateId: mandate.id });
                cart.status = "negotiated";
                saveCart(cart);
              }
              break;
            }

            const event = step.value;
            appendAuditEvent(event);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          }
        } catch (err: any) {
          const errorEvt: AgentEvent = {
            id: `err_${Date.now()}`,
            sessionId: sessionId || "unknown",
            type: "error",
            message: err.message || "Negotiation failed",
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
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", message: err.message },
      { status: 500 }
    );
  }
}
