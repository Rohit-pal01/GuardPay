import { describe, it, expect } from "vitest";
import { runBuyerAgent, runBuyerAgentStream } from "@/lib/agent/buyer-agent.js";
import { Mandate } from "@/contracts/mandate.js";

describe("Buyer Agent Workflow", () => {
  const mandate: Mandate = {
    id: "mandate_demo_01",
    maxPerPurchase: 250,
    maxSessionTotal: 1000,
    allowedCategories: ["Electronics"],
    blockedMerchants: ["RogueSeller"],
    deliverBy: new Date(Date.now() + 4 * 86400000).toISOString(),
    autoApproveBelow: 50,
    currency: "USD",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  it("runs end-to-end and produces a valid cart and stream of AgentEvents", async () => {
    const stream = runBuyerAgentStream({
      request: "noise-cancelling headphones under $250 by Friday",
      mandate,
    });

    const eventTypes: string[] = [];
    let result;

    while (true) {
      const step = await stream.next();
      if (step.done) {
        result = step.value;
        break;
      }
      eventTypes.push(step.value.type);
    }

    // Verify stream progression
    expect(eventTypes).toContain("intent_parsed");
    expect(eventTypes).toContain("search_started");
    expect(eventTypes).toContain("candidates_found");
    expect(eventTypes).toContain("ranked");
    expect(eventTypes).toContain("cart_ready");

    // Verify generated cart
    expect(result.cart).toBeDefined();
    expect(result.cart?.total).toBeLessThanOrEqual(250);
    expect(result.cart?.items.length).toBe(1);
    expect(result.selectedCandidate).toBeDefined();
  });

  it("emits blocked event when request is impossibly below market prices", async () => {
    const tightMandate: Mandate = {
      ...mandate,
      maxPerPurchase: 50, // No headphones in fixture <= $50
    };

    const res = await runBuyerAgent({
      request: "noise-cancelling headphones under $50",
      mandate: tightMandate,
    });

    const blockedEvent = res.events.find((e) => e.type === "blocked");
    expect(blockedEvent).toBeDefined();
    expect(res.cart).toBeUndefined();
  });
});
