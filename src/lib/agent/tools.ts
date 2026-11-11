import { z } from "zod";
import { Candidate } from "@/contracts/product.js";
import { Cart, CartSchema } from "@/contracts/cart.js";
import { Mandate } from "@/contracts/mandate.js";
import { ParsedIntent } from "@/contracts/api.js";
import { searchChannel3 } from "@/lib/search/channel3.js";
import { filterCandidates } from "@/lib/search/filter.js";
import { rankCandidates as scoreAndRank } from "@/lib/search/rank.js";
import { explainCandidates } from "./explain.js";
import { sanitizeCandidate } from "./sanitize.js";

/**
 * Tool: searchProducts
 */
export async function searchProductsTool(params: {
  query: string;
  category?: string;
  limit?: number;
}): Promise<Candidate[]> {
  const rawCandidates = await searchChannel3({
    query: params.query,
    category: params.category,
    limit: params.limit || 5,
  });

  return rawCandidates.map(sanitizeCandidate);
}

/**
 * Tool: rankCandidates
 */
export async function rankCandidatesTool(params: {
  candidates: Candidate[];
  intent: ParsedIntent;
  mandate?: Mandate;
}): Promise<{ ranked: Candidate[]; filteredOut: Array<{ candidate: Candidate; reason: string }> }> {
  // 1. Deterministic filter
  const { passed, filteredOut } = filterCandidates(params.candidates, {
    mandate: params.mandate,
    intent: params.intent,
  });

  // 2. Deterministic scoring
  const scored = scoreAndRank(passed, params.intent);

  // 3. Plain-English explanation for top 3
  const ranked = await explainCandidates(scored, params.intent, params.mandate);

  return { ranked, filteredOut };
}

/**
 * Tool: buildCart
 */
export function buildCartTool(params: {
  candidate: Candidate;
  mandateId: string;
  quantity?: number;
}): Cart {
  const quantity = params.quantity || 1;
  const subtotal = Math.round(params.candidate.price * quantity * 100) / 100;
  const shippingTotal = Math.round((params.candidate.shippingInfo?.cost || 0) * 100) / 100;
  const taxTotal = 0.0; // In sandbox demonstration, tax is 0 or estimated
  const total = Math.round((subtotal + shippingTotal + taxTotal) * 100) / 100;

  return CartSchema.parse({
    id: `cart_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    mandateId: params.mandateId,
    items: [
      {
        candidateId: params.candidate.id,
        title: params.candidate.title,
        price: params.candidate.price,
        quantity,
        merchant: params.candidate.merchant,
        category: params.candidate.category,
        shippingCost: shippingTotal,
      },
    ],
    subtotal,
    shippingTotal,
    taxTotal,
    total,
    currency: "USD",
    status: "draft",
    createdAt: new Date().toISOString(),
  });
}
