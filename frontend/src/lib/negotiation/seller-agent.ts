import { generateText } from "ai";
import { Candidate } from "@/contracts/product";
import { NegotiationTurn } from "@/contracts/negotiation";
import { getLLMModel } from "@/lib/llm/model";
import { isReplayMode } from "@/lib/llm/replay";
import { SELLER_AGENT_PROMPT } from "./prompts";

export interface SellerAgentInput {
  candidate: Candidate;
  floorPrice: number;
  buyerOffer: number;
  round: number;
  history: NegotiationTurn[];
}

export async function generateSellerTurn(input: SellerAgentInput): Promise<NegotiationTurn> {
  const { candidate, floorPrice, buyerOffer, round, history } = input;

  // 1. Calculate deterministic pricing bounds
  const listingPrice = candidate.price;
  // Concession formula: gradually move towards floor or meet buyer
  const targetCounter = calculateSellerCounter(listingPrice, floorPrice, buyerOffer, round);

  // 2. Real LLM Call (if available & not in mock/replay mode)
  const model = getLLMModel();
  if (model && !isReplayMode()) {
    try {
      const prompt = `Product: ${candidate.title}
Listing Price: $${listingPrice.toFixed(2)}
Hidden Floor Price: $${floorPrice.toFixed(2)}
Current Round: ${round} of 4
Buyer's Latest Offer: $${buyerOffer.toFixed(2)}
Prior Conversation:
${history.map((t) => `${t.speaker}: $${(t.offerPrice ?? 0).toFixed(2)} - "${t.message}"`).join("\n")}

Respond to the buyer with a counter-offer or accept their offer.
Your counter price should be around $${targetCounter.toFixed(2)} (or higher). You must never offer less than $${floorPrice.toFixed(2)}.`;

      const res = await generateText({
        model,
        system: SELLER_AGENT_PROMPT,
        prompt,
      });

      const text = res.text.trim();
      const extractedPrice = extractPrice(text) || targetCounter;
      // HARD CODE GUARDRAIL: Seller never goes below floorPrice
      const safePrice = Math.max(extractedPrice, floorPrice);

      return {
        round,
        speaker: "seller",
        offerPrice: Math.round(safePrice * 100) / 100,
        message: text,
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      console.warn("LLM seller turn failed, using smart heuristic:", err);
    }
  }

  // 3. Fallback Heuristic Generator
  return generateFallbackSellerTurn(candidate, floorPrice, buyerOffer, round, targetCounter);
}

function calculateSellerCounter(
  listingPrice: number,
  floorPrice: number,
  buyerOffer: number,
  round: number
): number {
  if (buyerOffer >= floorPrice && buyerOffer >= listingPrice * 0.95) {
    return buyerOffer; // Accept buyer's offer
  }

  // Calculate discount based on round
  const maxDiscount = listingPrice - floorPrice;
  const concessionStep = (maxDiscount / 4) * round;
  const rawCounter = listingPrice - concessionStep;

  // If buyer offer is above floor and within $5 of counter, meet them
  if (buyerOffer >= floorPrice && Math.abs(rawCounter - buyerOffer) < 6) {
    return buyerOffer;
  }

  return Math.max(rawCounter, floorPrice);
}

function generateFallbackSellerTurn(
  candidate: Candidate,
  floorPrice: number,
  buyerOffer: number,
  round: number,
  targetCounter: number
): NegotiationTurn {
  let message: string;
  const safePrice = Math.max(targetCounter, floorPrice);

  if (buyerOffer >= safePrice) {
    message = `We have a deal! I am delighted to accept your offer of $${buyerOffer.toFixed(2)} for the ${candidate.title}.`;
    return {
      round,
      speaker: "seller",
      offerPrice: buyerOffer,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  if (round === 1) {
    message = `Thank you for your interest! $${buyerOffer.toFixed(2)} is a bit low for this high-demand model, but I can discount it to $${safePrice.toFixed(2)} with free shipping.`;
  } else if (round === 2) {
    message = `I appreciate your counter-offer. I can meet you further down at $${safePrice.toFixed(2)}. This is a fantastic value for the condition and warranty.`;
  } else if (round >= 3) {
    message = `This is our final bottom-line clearance price: $${safePrice.toFixed(2)}. If you can checkout now, we will honor this deal.`;
  } else {
    message = `Best price we can do is $${safePrice.toFixed(2)}.`;
  }

  return {
    round,
    speaker: "seller",
    offerPrice: Math.round(safePrice * 100) / 100,
    message,
    timestamp: new Date().toISOString(),
  };
}

function extractPrice(text: string): number | null {
  const match = text.match(/\$(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}
