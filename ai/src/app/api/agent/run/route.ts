import { NextRequest, NextResponse } from "next/server";
import { RunAgentRequestSchema } from "@/contracts/api.js";
import { getMandate } from "@/lib/db/mandate-repo.js";
import { saveCart } from "@/lib/db/cart-repo.js";
import { appendAuditEvent } from "@/lib/db/audit-repo.js";
import { runBuyerAgentStream } from "@/lib/agent/buyer-agent.js";
import { AgentEvent } from "@/contracts/events.js";

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
    const mandate = getMandate(mandateId);

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
        appendAuditEvent(step.value);
      }

      if (result.cart) {
        saveCart(result.cart);
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
                saveCart(finalResult.cart);
              }
              break;
            }

            const event = step.value;
            appendAuditEvent(event);
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          }
        } catch (err: any) {
          const errorEvt: AgentEvent = {
            id: `err_${Date.now()}`,
            sessionId: sessionId || "unknown",
            type: "error",
            message: err.message || "Agent execution failed",
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

