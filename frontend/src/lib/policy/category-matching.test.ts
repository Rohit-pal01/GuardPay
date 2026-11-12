import { describe, expect, it } from "vitest";
import { isCategoryAllowed } from "./category-matching";

describe("isCategoryAllowed", () => {
  it("accepts a granular audio product under an electronics mandate", () => {
    expect(isCategoryAllowed("Over-Ear Headphones", ["electronics"])).toBe(true);
  });

  it("keeps unrelated categories disallowed", () => {
    expect(isCategoryAllowed("Furniture", ["electronics", "audio"])).toBe(false);
  });
});
