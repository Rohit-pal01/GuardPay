import fs from "node:fs";
import path from "node:path";
import { Candidate } from "@/contracts/product.js";
import { Mandate } from "@/contracts/mandate.js";
import { Negotiation, NegotiationTurn, NegotiationSchema } from "@/contracts/negotiation.js";
import { AgentEvent } from "@/contracts/events.js";
import { isReplayMode } from "@/lib/llm/replay.js";
import { generateSellerTurn } from "./seller-agent.js";

const FIXTURE_PATH = path.resolve(process.cwd(), "fixtures", "recorded-negotiation.json");

export interface RunNegotiationInput {
  candidate: Candidate;
  mandate: Mandate;
  floorPrice?: number;
  sessionId?: string;
}

export async function* runNegotiationLoop(
  input: RunNegotiationInput
): AsyncGenerator<AgentEvent, Negotiation, unknown> {
  const sessionId = input.sessionId || `session_${Date.now()}`;
  const { candidate, mandate } = input;
  const listingPrice = candidate.price;
  const ceilingPrice = mandate.maxPerPurchase;
  // Retailer hidden floor: default 85% of listing price
  const floorPrice = input.floorPrice ?? Math.round(listingPrice * 0.85 * 100) / 100;

  // 1. Replay Mode Check
  if (isReplayMode() && fs.existsSync(FIXTURE_PATH)) {
    try {
      const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
      const fixtureData = JSON.parse(raw);
      const record = fixtureData.sony_wh1000xm4 || Object.values(fixtureData)[0];

      if (record && record.turns) {
        for (const turn of record.turns as NegotiationTurn[]) {
          yield createEvent(sessionId, "negotiation_turn", `${turn.speaker.toUpperCase()}: $${turn.offerPrice.toFixed(2)} - ${turn.message}`, {
            round: turn.round,
            speaker: turn.speaker,
            offerPrice: turn.offerPrice,
            message: turn.message,
          });
        }

        const finalPrice = record.finalPrice || record.turns[record.turns.length - 1].offerPrice;
        yield createEvent(sessionId, "negotiation_settled", `Negotiation successfully settled at $${finalPrice.toFixed(2)} (within Mandate limit: $${ceilingPrice.toFixed(2)})`, {
          finalPrice,
          originalPrice: listingPrice,
          savings: Math.round((listingPrice - finalPrice) * 100) / 100,
        });

        return NegotiationSchema.parse({
          id: `neg_${Date.now()}`,
          candidateId: candidate.id,
          mandateId: mandate.id,
          initialPrice: listingPrice,
          floorPrice,
          ceilingPrice,
          status: "settled",
          turns: record.turns,
          finalPrice,
          summary: `Price negotiated down from $${listingPrice.toFixed(2)} to $${finalPrice.toFixed(2)}.`,
        });
      }
    } catch (err) {
      console.warn("Replay negotiation fixture error:", err);
    }
  }

  // 2. Live / Heuristic Multi-Turn Negotiation Loop (Max 4 Rounds)
  const turns: NegotiationTurn[] = [];
  let currentStatus: Negotiation["status"] = "in_progress";
  let finalPrice: number | undefined = undefined;

  // Initial buyer opening offer: lower of 88% listing or 95% ceiling
  let buyerOffer = Math.min(
    Math.round(listingPrice * 0.88 * 100) / 100,
    Math.round(ceilingPrice * 0.95 * 100) / 100
  );

  for (let round = 1; round <= 4; round++) {
    // Buyer's Turn
    const buyerMessage = round === 1
      ? `Hello! We are looking to buy the ${candidate.title}. Can you do $${buyerOffer.toFixed(2)}?`
      : `Would you consider meeting at $${buyerOffer.toFixed(2)}? We can checkout immediately.`;

    const buyerTurn: NegotiationTurn = {
      round,
      speaker: "buyer",
      offerPrice: buyerOffer,
      message: buyerMessage,
      timestamp: new Date().toISOString(),
    };
    turns.push(buyerTurn);
    yield createEvent(sessionId, "negotiation_turn", `BUYER (Round ${round}): Offered $${buyerOffer.toFixed(2)}`, {
      round,
      speaker: "buyer",
      offerPrice: buyerOffer,
      message: buyerMessage,
    });

    // Seller's Turn
    const sellerTurn = await generateSellerTurn({
      candidate,
      floorPrice,
      buyerOffer,
      round,
      history: turns,
    });
    turns.push(sellerTurn);
    yield createEvent(sessionId, "negotiation_turn", `SELLER (Round ${round}): Countered $${sellerTurn.offerPrice.toFixed(2)}`, {
      round,
      speaker: "seller",
      offerPrice: sellerTurn.offerPrice,
      message: sellerTurn.message,
    });

    // Check Agreement Condition
    // If seller accepted buyer offer or seller counter is within buyer's ceiling
    if (sellerTurn.offerPrice <= buyerOffer || sellerTurn.offerPrice <= ceilingPrice && Math.abs(sellerTurn.offerPrice - buyerOffer) <= 5) {
      finalPrice = Math.min(sellerTurn.offerPrice, ceilingPrice);
      // Hard guardrail: never below floor
      finalPrice = Math.max(finalPrice, floorPrice);
      currentStatus = "settled";

      // Final confirmation buyer turn
      const confirmationTurn: NegotiationTurn = {
        round,
        speaker: "buyer",
        offerPrice: finalPrice,
        message: `Deal agreed at $${finalPrice.toFixed(2)}! Proceeding to PayPal settlement under Mandate approval.`,
        timestamp: new Date().toISOString(),
      };
      turns.push(confirmationTurn);
      yield createEvent(sessionId, "negotiation_turn", `BUYER (Agreed): Deal confirmed at $${finalPrice.toFixed(2)}`, {
        round,
        speaker: "buyer",
        offerPrice: finalPrice,
        message: confirmationTurn.message,
      });

      break;
    }

    // Prepare next buyer offer for next round (split the difference)
    buyerOffer = Math.round(((buyerOffer + sellerTurn.offerPrice) / 2) * 100) / 100;
    // Hard ceiling: buyer never offers above mandate ceiling
    buyerOffer = Math.min(buyerOffer, ceilingPrice);
  }

  // End of loop check
  if (!finalPrice) {
    const lastSellerTurn = turns.filter((t) => t.speaker === "seller").pop();
    if (lastSellerTurn && lastSellerTurn.offerPrice <= ceilingPrice) {
      finalPrice = lastSellerTurn.offerPrice;
      currentStatus = "settled";
    } else {
      currentStatus = "walk_away";
    }
  }

  if (currentStatus === "settled" && finalPrice) {
    yield createEvent(sessionId, "negotiation_settled", `Negotiation successfully settled at $${finalPrice.toFixed(2)} (Saved $${(listingPrice - finalPrice).toFixed(2)})`, {
      finalPrice,
      originalPrice: listingPrice,
      savings: Math.round((listingPrice - finalPrice) * 100) / 100,
    });
  } else {
    yield createEvent(sessionId, "blocked", `Negotiation concluded without deal: seller lowest offer exceeded Mandate ceiling ($${ceilingPrice.toFixed(2)})`, {
      ceilingPrice,
      lowestSellerOffer: turns.filter((t) => t.speaker === "seller").slice(-1)[0]?.offerPrice,
    });
  }

  return NegotiationSchema.parse({
    id: `neg_${Date.now()}`,
    candidateId: candidate.id,
    mandateId: mandate.id,
    initialPrice: listingPrice,
    floorPrice,
    ceilingPrice,
    status: currentStatus,
    turns,
    finalPrice,
    summary: currentStatus === "settled"
      ? `Agreed on $${finalPrice?.toFixed(2)} after ${turns.length / 2} rounds.`
      : "No deal reached within Mandate ceiling.",
  });
}

function createEvent(
  sessionId: string,
  type: AgentEvent["type"],
  message: string,
  payload: Record<string, any>
): AgentEvent {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    sessionId,
    type,
    message,
    payload,
    timestamp: new Date().toISOString(),
  };
}

