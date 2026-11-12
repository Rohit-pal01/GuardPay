import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// FR-A2-22 / NFR-1: no path to PayPal except the executor (A1's folder and A1's order routes excepted).
const SRC = join(__dirname, "..", "..");
const ALLOWED = [
  /^lib\/paypal\//,
  /^lib\/policy\/executor(\.test)?\.ts$/,
  /^lib\/policy\/architecture\.test\.ts$/,
];
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe("payment path is closed", () => {
  it("only the executor imports lib/paypal", () => {
    const offenders = walk(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .map((f) => relative(SRC, f).replaceAll("\\", "/"))
      .filter((rel) => !ALLOWED.some((a) => a.test(rel)))
      .filter((rel) =>
        /from\s+['"][^'"]*\/paypal(\/[^'"]*)?['"]|import\(['"][^'"]*\/paypal/.test(
          readFileSync(join(SRC, rel), "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
});
