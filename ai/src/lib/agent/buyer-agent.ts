import { AgentEvent } from "@/contracts/events.js";
import { Mandate } from "@/contracts/mandate.js";
import { Cart } from "@/contracts/cart.js";
import { Candidate } from "@/contracts/product.js";
import { parseIntent } from "./parse-intent.js";
import { searchProductsTool, rankCandidatesTool, buildCartTool } from "./tools.js";

export interface BuyerAgentInput {
  request: string;
  mandate: Mandate;
  sessionId?: string;
}

export interface BuyerAgentResult {
  cart?: Cart;
  selectedCandidate?: Candidate;
  candidates: Candidate[];
  events: AgentEvent[];
}

/**
 * Executes the full buyer agent flow, yielding AgentEvents as they occur
 * to support real-time Server-Sent Events (SSE) streaming.
 */
export async function* runBuyerAgentStream(
  input: BuyerAgentInput
): AsyncGenerator<AgentEvent, BuyerAgentResult, unknown> {
  const sessionId = input.sessionId || `session_${Date.now()}`;
  const events: AgentEvent[] = [];

  const emit = (type: AgentEvent["type"], message: string, payload: Record<string, any> = {}): AgentEvent => {
    const event: AgentEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      sessionId,
      type,
      message,
      payload,
      timestamp: new Date().toISOString(),
    };
    events.push(event);
    return event;
  };

  try {
    // Step 1: Parse Intent
    const intent = await parseIntent(input.request);
    yield emit("intent_parsed", `Parsed shopping request: "${intent.query}" with budget limit: $${intent.maxPrice ?? input.mandate.maxPerPurchase}`, {
      intent,
      mandateId: input.mandate.id,
    });

    // Step 2: Product Search via Channel3
    yield emit("search_started", `Searching product catalog for "${intent.query}"...`, {
      query: intent.query,
      category: intent.category,
    });

    const rawCandidates = await searchProductsTool({
      query: intent.query,
      category: intent.category,
    });

    yield emit("candidates_found", `Found ${rawCandidates.length} product listings matching criteria`, {
      candidateCount: rawCandidates.length,
      candidateIds: rawCandidates.map((c) => c.id),
    });

    // Step 3: Deterministic Filtering & LLM Ranking with Reasons
    const { ranked, filteredOut } = await rankCandidatesTool({
      candidates: rawCandidates,
      intent,
      mandate: input.mandate,
    });

    if (ranked.length === 0) {
      const reasons = filteredOut.map((f) => `${f.candidate.title}: ${f.reason}`);
      const blockedEvent = emit("blocked", "All candidate products exceeded Mandate constraints", {
        filteredOutCount: filteredOut.length,
        reasons,
      });
      yield blockedEvent;

      return {
        candidates: [],
        events,
      };
    }

    yield emit("ranked", `Evaluated and ranked top ${ranked.length} candidates against Mandate policy`, {
      ranked: ranked.slice(0, 3).map((c) => ({
        id: c.id,
        title: c.title,
        price: c.price,
        score: c.score,
        explanation: c.explanation,
      })),
      filteredOutCount: filteredOut.length,
    });

    // Step 4: Build Cart with Top Pick
    const topCandidate = ranked[0];
    const cart = buildCartTool({
      candidate: topCandidate,
      mandateId: input.mandate.id,
      quantity: 1,
    });

    yield emit("cart_ready", `Created draft cart for "${topCandidate.title}" at $${cart.total.toFixed(2)}`, {
      cartId: cart.id,
      total: cart.total,
      currency: cart.currency,
      itemCount: cart.items.length,
    });

    return {
      cart,
      selectedCandidate: topCandidate,
      candidates: ranked,
      events,
    };
  } catch (error: any) {
    const errorEvent = emit("error", `Agent encountered an error: ${error.message || "Unknown error"}`, {
      error: String(error),
    });
    yield errorEvent;

    return {
      candidates: [],
      events,
    };
  }
}

/**
 * Non-streaming wrapper for tests or direct API calls
 */
export async function runBuyerAgent(input: BuyerAgentInput): Promise<BuyerAgentResult> {
  const iterator = runBuyerAgentStream(input);
  let finalResult: BuyerAgentResult = { candidates: [], events: [] };

  while (true) {
    const step = await iterator.next();
    if (step.done) {
      finalResult = step.value;
      break;
    }
  }

  return finalResult;
}

