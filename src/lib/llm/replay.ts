import fs from "node:fs";
import path from "node:path";

const FIXTURE_PATH = path.resolve(process.cwd(), "fixtures", "recorded-llm.json");

export function isReplayMode(): boolean {
  return process.env.DEMO_MODE === "replay" || process.env.USE_MOCKS === "true";
}

export function getRecordedLLM<T = any>(key: string): T | null {
  try {
    if (!fs.existsSync(FIXTURE_PATH)) {
      return null;
    }
    const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return data[key] ?? null;
  } catch {
    return null;
  }
}

export function saveRecordedLLM(key: string, value: any): void {
  try {
    const raw = fs.existsSync(FIXTURE_PATH) ? fs.readFileSync(FIXTURE_PATH, "utf-8") : "{}";
    const data = JSON.parse(raw);
    data[key] = value;
    fs.writeFileSync(FIXTURE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save LLM fixture:", err);
  }
}

