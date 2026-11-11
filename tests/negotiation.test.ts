import { describe, it, expect } from "vitest";
import { runNegotiationLoop } from "@/lib/negotiation/loop.js";
import { Candidate } from "@/contracts/product.js";
import { Mandate } from "@/contracts/mandate.js";

describe("Negotiation Loop & Multi-Turn Guardrails", () => {
  const candidate: Candidate = {
    id: "ch3_prod_sony_wh1000xm4",
    title: "Sony WH-1000XM4 Wireless Premium Noise-Canceling Headphones",
    description: "Premium headphones with ANC.",
    price: 228.0,
    currency: "USD",
    merchant: "BestBuy",
    category: "Electronics",
    url: "https://example.com/sony",
    availability: "in_stock",
  };

  const mandate: Mandate = {
    id: "mandate_demo_01",
    maxPerPurchase: 250,
    maxSessionTotal: 1000,
    allowedCategories: ["Electronics"],
    blockedMerchants: [],
    autoApproveBelow: 50,
    currency: "USD",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  it("settles negotiation within 4 rounds honoring floor and ceiling bounds", async () => {
    const loop = runNegotiationLoop({
      candidate,
      mandate,
      floorPrice: 195.0, // Hidden seller floor
    });

    const events = [];
    let negotiation;

    while (true) {
      const step = await loop.next();
      if (step.done) {
        negotiation = step.value;
        break;
      }
      events.push(step.value);
    }

    expect(negotiation.status).toBe("settled");
    expect(negotiation.turns.length).toBeGreaterThan(0);
    expect(negotiation.turns.length).toBeLessThanOrEqual(8); // At most 4 rounds (buyer + seller = 8 turns)

    // Verify hard guardrails
    if (negotiation.finalPrice) {
      expect(negotiation.finalPrice).toBeGreaterThanOrEqual(195.0); // Seller floor preserved
      expect(negotiation.finalPrice).toBeLessThanOrEqual(250.0); // Buyer mandate ceiling preserved
    }

    // Verify events streamed
    const turnEvents = events.filter((e) => e.type === "negotiation_turn");
    expect(turnEvents.length).toBeGreaterThan(0);
    const settledEvent = events.find((e) => e.type === "negotiation_settled");
    expect(settledEvent).toBeDefined();
  });
});
