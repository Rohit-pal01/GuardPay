import { NextRequest, NextResponse } from "next/server";
import { RunAgentRequestSchema } from "@/contracts/api";
import { getMandate } from "@/lib/db/mandate-repo";
import { saveCart } from "@/lib/db/cart-repo";
import { appendAuditEvent, getSessionSpent } from "@/lib/db/audit-repo";
import { runBuyerAgentStream } from "@/lib/agent/buyer-agent";
import { AgentEvent } from "@/contracts/events";
import { evaluatePolicy } from "@/lib/policy/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = RunAgentRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { request: userRequest, mandateId, sessionId } = parsed.data;
    const mandate = await getMandate(mandateId);

    if (!mandate) {
      return NextResponse.json(
        { error: `Mandate with ID "${mandateId}" not found` },
        { status: 404 }
      );
    }

    const wantsJson = req.headers.get("accept")?.includes("application/json") &&
                      !req.headers.get("accept")?.includes("text/event-stream");

    if (wantsJson) {
      // Non-streaming response for programmatic JSON clients
      const events: AgentEvent[] = [];
      const stream = runBuyerAgentStream({ request: userRequest, mandate, sessionId });
      let result;

      while (true) {
        const step = await stream.next();
        if (step.done) {
          result = step.value;
          break;
        }
        events.push(step.value);
        await appendAuditEvent(step.value);
      }

      if (result.cart) {
        await Promise.all(Object.values(result.cartsByCandidateId).map(saveCart));
        const decision = evaluatePolicy(result.cart, mandate, {
          sessionSpentTotal: await getSessionSpent(sessionId),
        });
        const policyEvent = createPolicyEvent(sessionId, result.cart.id, decision);
        events.push(policyEvent);
        await appendAuditEvent(policyEvent);
      }

      return NextResponse.json({
        success: true,
        events,
        result,
      });
    }

    // Default: SSE stream for real-time UI updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const agentStream = runBuyerAgentStream({ request: userRequest, mandate, sessionId });

          while (true) {
            const step = await agentStream.next();
            if (step.done) {
              const finalResult = step.value;
              if (finalResult.cart) {
                await Promise.all(Object.values(finalResult.cartsByCandidateId).map(saveCart));
                const decision = evaluatePolicy(finalResult.cart, mandate, {
                  sessionSpentTotal: await getSessionSpent(sessionId),
                });
                const policyEvent = createPolicyEvent(sessionId, finalResult.cart.id, decision);
                await appendAuditEvent(policyEvent);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(policyEvent)}\n\n`));
              }
              break;
            }

            const event = step.value;
            await appendAuditEvent(event);
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Agent execution failed';
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

function createPolicyEvent(sessionId: string | undefined, cartId: string, decision: ReturnType<typeof evaluatePolicy>): AgentEvent {
  const type = decision.verdict === "deny" ? "blocked" : decision.verdict === "needs_approval" ? "awaiting_approval" : "approved";
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sessionId: sessionId || "session-default",
    type,
    message: `Policy Engine verdict: ${decision.verdict.toUpperCase()}. ${decision.reasons.join(" ")}`,
    data: { cartId, decision },
    timestamp: new Date().toISOString(),
  };
}
