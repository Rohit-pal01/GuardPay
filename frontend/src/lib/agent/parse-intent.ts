import { generateText, Output } from "ai";
import { ParsedIntent, ParsedIntentSchema } from "@/contracts/api";
import { getLLMModel } from "@/lib/llm/model";
import { getRecordedLLM, isReplayMode, saveRecordedLLM } from "@/lib/llm/replay";

const PARSE_INTENT_SYSTEM_PROMPT = `You are an AI purchasing assistant intent parser.
Your job is to parse a user's natural language shopping request into structured constraints.
Extract:
- query: The clean product search query without budget/date words.
- category: Inferred product category (e.g. Electronics, Footwear, Home, Apparel).
- maxPrice: Maximum dollar budget specified by the user (number, in USD), if any.
- deliverBy: Target delivery deadline if requested (e.g. ISO date or day of week).
- preferredMerchant: Preferred store if mentioned.
- features: Key requested attributes (e.g. ["noise-cancelling", "wireless"]).
- rawRequest: The exact user input string.`;

export async function parseIntent(request: string): Promise<ParsedIntent> {
  const trimmed = request.trim();
  const cacheKey = `parse-intent:${trimmed}`;

  // 1. Replay / Mock Cache Check
  if (isReplayMode()) {
    const recorded = getRecordedLLM<ParsedIntent>(cacheKey);
    if (recorded) {
      return ParsedIntentSchema.parse(recorded);
    }
  }

  // 2. Real LLM Execution via AI SDK (if model available)
  const model = getLLMModel();
  if (model) {
    try {
      const result = await generateText({
        model,
        output: Output.object({ schema: ParsedIntentSchema }),
        system: PARSE_INTENT_SYSTEM_PROMPT,
        prompt: `Parse this shopping request: "${trimmed}"`,
      });

      if (result.output) {
        saveRecordedLLM(cacheKey, result.output);
        return result.output;
      }
    } catch (err) {
      console.warn("LLM intent parsing failed, falling back to deterministic parser:", err);
    }
  }

  // 3. Deterministic Heuristic Parser (Resilient Fallback)
  return fallbackParseIntent(trimmed);
}

/**
 * Deterministic fallback parser to guarantee zero downtime and valid zod output
 */
export function fallbackParseIntent(request: string): ParsedIntent {
  let query = request;
  let maxPrice: number | undefined = undefined;
  let deliverBy: string | undefined = undefined;
  let category: string | undefined = undefined;
  const features: string[] = [];

  // Match budget / price patterns
  const priceMatch = request.match(/(?:under|below|less than|up to|max(?:imum)?)\s*\$?(\d+(?:\.\d+)?)/i) ||
                     request.match(/\$(\d+(?:\.\d+)?)/);
  if (priceMatch) {
    maxPrice = parseFloat(priceMatch[1]);
    query = query.replace(priceMatch[0], "");
  }

  // Match delivery deadline patterns
  const deliverMatch = request.match(/\b(?:by|before|deliver(?:ed)? by)\s+([a-z0-9\/-]+)/i);
  if (deliverMatch) {
    const dateStr = deliverMatch[1].toLowerCase();
    deliverBy = resolveRelativeDate(dateStr);
    query = query.replace(deliverMatch[0], "");
  }

  // Infer category & features
  const lower = request.toLowerCase();
  if (lower.includes("headphone") || lower.includes("earbud") || lower.includes("laptop") || lower.includes("phone") || lower.includes("electronics")) {
    category = "Electronics";
  } else if (lower.includes("shoe") || lower.includes("sneaker") || lower.includes("shirt") || lower.includes("jacket")) {
    category = "Apparel";
  }

  if (lower.includes("noise-cancelling") || lower.includes("noise cancelling") || lower.includes("anc")) {
    features.push("noise-cancelling");
  }
  if (lower.includes("wireless") || lower.includes("bluetooth")) {
    features.push("wireless");
  }

  // Clean residual noise from search query
  const cleanQuery = query
    .replace(/\b(?:i want|i need|find me|buy me|get me|looking for|under|for|please)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return ParsedIntentSchema.parse({
    query: cleanQuery || request,
    category,
    maxPrice,
    deliverBy,
    features,
    rawRequest: request,
  });
}

function resolveRelativeDate(dateStr: string): string {
  const now = new Date();
  const lower = dateStr.toLowerCase();

  if (lower === "friday") {
    const day = now.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 || 7;
    const friday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
    friday.setHours(23, 59, 59, 999);
    return friday.toISOString();
  }

  if (lower === "tomorrow") {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(23, 59, 59, 999);
    return tomorrow.toISOString();
  }

  return dateStr;
}
