import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "@/lib/policy/engine.js";
import { Mandate } from "@/contracts/mandate.js";
import { Cart } from "@/contracts/cart.js";

describe("Policy Engine Guardrails", () => {
  const baseMandate: Mandate = {
    id: "mandate_test_policy",
    maxPerPurchase: 250.0,
    maxSessionTotal: 1000.0,
    allowedCategories: ["Electronics", "Audio"],
    blockedMerchants: ["ShadyStore", "RogueSeller"],
    autoApproveBelow: 50.0,
    currency: "USD",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };

  const createSampleCart = (total: number, merchant = "BestBuy", category = "Electronics"): Cart => ({
    id: `cart_${Date.now()}`,
    mandateId: baseMandate.id,
    items: [
      {
        candidateId: "prod_01",
        title: "Test Product",
        price: total,
        quantity: 1,
        merchant,
        category,
        shippingCost: 0,
      },
    ],
    subtotal: total,
    shippingTotal: 0,
    taxTotal: 0,
    total,
    currency: "USD",
    status: "draft",
    createdAt: new Date().toISOString(),
  });

  it("returns 'allow' when cart total is below autoApproveBelow threshold", () => {
    const cart = createSampleCart(35.0);
    const decision = evaluatePolicy(cart, baseMandate);

    expect(decision.verdict).toBe("allow");
    expect(decision.reasons[0]).toContain("Zero-click autonomous approval");
  });

  it("returns 'needs_approval' when cart is within budget but above autoApproveBelow", () => {
    const cart = createSampleCart(220.0);
    const decision = evaluatePolicy(cart, baseMandate);

    expect(decision.verdict).toBe("needs_approval");
    expect(decision.reasons[0]).toContain("One-tap human approval required");
  });

  it("returns 'deny' when cart total exceeds maxPerPurchase limit", () => {
    const cart = createSampleCart(350.0); // Limit is $250
    const decision = evaluatePolicy(cart, baseMandate);

    expect(decision.verdict).toBe("deny");
    expect(decision.ruleIds).toContain("RULE_PER_PURCHASE_CAP");
  });

  it("returns 'deny' when merchant is on blocked list", () => {
    const cart = createSampleCart(40.0, "ShadyStore");
    const decision = evaluatePolicy(cart, baseMandate);

    expect(decision.verdict).toBe("deny");
    expect(decision.ruleIds).toContain("RULE_BLOCKED_MERCHANTS");
  });

  it("returns 'deny' when category is not in allowed list", () => {
    const cart = createSampleCart(40.0, "BestBuy", "Jewelry");
    const decision = evaluatePolicy(cart, baseMandate);

    expect(decision.verdict).toBe("deny");
    expect(decision.ruleIds).toContain("RULE_CATEGORY_ALLOWLIST");
  });

  it("returns 'deny' when mandate is expired", () => {
    const expiredMandate: Mandate = {
      ...baseMandate,
      expiresAt: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
    };
    const cart = createSampleCart(40.0);
    const decision = evaluatePolicy(cart, expiredMandate);

    expect(decision.verdict).toBe("deny");
    expect(decision.ruleIds).toContain("RULE_MANDATE_EXPIRATION");
  });

  it("detects and denies price drift at checkout time", () => {
    const cart = createSampleCart(220.0);
    const decision = evaluatePolicy(cart, baseMandate, { originalCartTotal: 200.0 });

    expect(decision.verdict).toBe("deny");
    expect(decision.ruleIds).toContain("RULE_PRICE_DRIFT");
  });
});

