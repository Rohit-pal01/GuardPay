import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV1 } from "ai";
import { isReplayMode } from "./replay";

export function getLLMModel(): LanguageModelV1 | null {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.LLM_MODEL || "gemini-2.5-flash";

  if (!apiKey || apiKey === "mock_gemini_key" || isReplayMode()) {
    // Return null or marker to signal fallback / mock handling
    return null;
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  return google(modelName) as unknown as LanguageModelV1;
}

export function isLLMConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== "mock_gemini_key");
}
