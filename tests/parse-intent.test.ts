import { describe, it, expect } from "vitest";
import { parseIntent, fallbackParseIntent } from "@/lib/agent/parse-intent.js";
import { ParsedIntentSchema } from "@/contracts/api.js";

describe("parseIntent", () => {
  it("parses natural language shopping request with budget and delivery", async () => {
    const request = "noise-cancelling headphones under $250 by Friday";
    const result = await parseIntent(request);

    expect(ParsedIntentSchema.safeParse(result).success).toBe(true);
    expect(result.maxPrice).toBe(250);
    expect(result.query.toLowerCase()).toContain("headphones");
    expect(result.category).toBe("Electronics");
    expect(result.features).toContain("noise-cancelling");
    expect(result.deliverBy).toBeDefined();
  });

  it("handles requests without budget or delivery constraints", () => {
    const result = fallbackParseIntent("ergonomic wireless mouse");
    expect(result.maxPrice).toBeUndefined();
    expect(result.query.toLowerCase()).toContain("mouse");
  });

  it("extracts dollar amounts correctly", () => {
    const result = fallbackParseIntent("mechanical keyboard max $120");
    expect(result.maxPrice).toBe(120);
    expect(result.query.toLowerCase()).toContain("mechanical keyboard");
  });
});
