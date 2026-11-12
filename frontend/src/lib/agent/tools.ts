import { Candidate } from "@/contracts/product";
import { Cart, CartSchema } from "@/contracts/cart";
import { Mandate } from "@/contracts/mandate";
import { ParsedIntent } from "@/contracts/api";
import { searchChannel3 } from "@/lib/search/channel3";
import { filterCandidates } from "@/lib/search/filter";
import { rankCandidates as scoreAndRank } from "@/lib/search/rank";
import { explainCandidates } from "./explain";
import { sanitizeCandidate } from "./sanitize";

/**
 * Tool: searchProducts
 */
export async function searchProductsTool(params: {
  query: string;
  category?: string;
  limit?: number;
  /** The hard ceiling used to guide the upstream product search. */
  maxPrice?: number;
}): Promise<Candidate[]> {
  // Channel3 accepts natural-language search. Adding the hard price ceiling to
  // the query makes its ranked results much more likely to satisfy the
  // deterministic Mandate filter that still runs below.
  const query = params.maxPrice !== undefined
    ? `${params.query} under $${params.maxPrice}`
    : params.query;

  const rawCandidates = await searchChannel3({
    query,
    category: params.category,
    // Ask for a wider candidate pool before policy filtering. The UI still
    // presents only the top three compliant products.
    limit: params.limit || 20,
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
  sessionId?: string;
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
    sessionId: params.sessionId,
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
