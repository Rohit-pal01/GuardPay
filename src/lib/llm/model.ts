import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { isReplayMode } from "./replay.js";

export function getLLMModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.LLM_MODEL || "gemini-2.5-flash";

  if (!apiKey || apiKey === "mock_gemini_key" || isReplayMode()) {
    // Return null or marker to signal fallback / mock handling
    return null;
  }

  const google = createGoogleGenerativeAI({
    apiKey,
  });

  return google(modelName);
}

export function isLLMConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key !== "mock_gemini_key");
}

