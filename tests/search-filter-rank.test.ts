import { describe, it, expect } from "vitest";
import { getMockCandidates } from "@/lib/search/mock.js";
import { filterCandidates } from "@/lib/search/filter.js";
import { rankCandidates } from "@/lib/search/rank.js";
import { Mandate } from "@/contracts/mandate.js";
import { ParsedIntent } from "@/contracts/api.js";

describe("Product Search, Filtering, and Ranking", () => {
  const mandate: Mandate = {
    id: "mandate_test_01",
    maxPerPurchase: 250,
    maxSessionTotal: 500,
    allowedCategories: ["Electronics"],
    blockedMerchants: ["RogueSeller"],
    deliverBy: new Date(Date.now() + 4 * 86400000).toISOString(),
    autoApproveBelow: 50,
    currency: "USD",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  const intent: ParsedIntent = {
    query: "noise-cancelling headphones",
    category: "Electronics",
    maxPrice: 250,
    features: ["noise-cancelling"],
    rawRequest: "noise-cancelling headphones under $250",
  };

  it("loads and parses mock candidates from fixtures", () => {
    const candidates = getMockCandidates();
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].price).toBeGreaterThan(0);
    expect(candidates[0].merchant).toBeDefined();
  });

  it("filters out items that exceed mandate price cap or blocked merchants", () => {
    const candidates = getMockCandidates();
    const { passed, filteredOut } = filterCandidates(candidates, { mandate, intent });

    // Apple AirPods Max ($479) should be filtered out (budget cap $250)
    const overBudget = filteredOut.find((f) => f.candidate.price > 250);
    expect(overBudget).toBeDefined();
    expect(overBudget?.reason).toContain("exceeds budget ceiling");

    // RogueSeller should be filtered out (blocked merchant)
    const rogue = filteredOut.find((f) => f.candidate.merchant === "RogueSeller");
    expect(rogue).toBeDefined();
    expect(rogue?.reason).toContain("blocked merchants");

    // All passed candidates must be <= $250 and not RogueSeller
    for (const c of passed) {
      expect(c.price).toBeLessThanOrEqual(250);
      expect(c.merchant).not.toBe("RogueSeller");
    }
  });

  it("ranks candidates and computes composite score", () => {
    const candidates = getMockCandidates().filter((c) => c.price <= 250 && c.merchant !== "RogueSeller");
    const ranked = rankCandidates(candidates, intent);

    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].score).toBeDefined();
    // Verify descending sort order
    for (let i = 1; i < ranked.length; i++) {
      expect((ranked[i - 1].score ?? 0) >= (ranked[i].score ?? 0)).toBe(true);
    }
  });
});
