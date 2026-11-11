import { Candidate } from "@/contracts/product.js";
import { getMockCandidates, mapRawToCandidate } from "./mock.js";

export interface Channel3SearchParams {
  query: string;
  category?: string;
  limit?: number;
}

export async function searchChannel3(params: Channel3SearchParams): Promise<Candidate[]> {
  const apiKey = process.env.CHANNEL3_API_KEY;
  const useMocks = process.env.USE_MOCKS === "true" || process.env.DEMO_MODE === "replay";

  if (useMocks || !apiKey || apiKey === "mock_channel3_key") {
    return getMockCandidates(params.query);
  }

  try {
    const url = new URL("https://api.channel3.ai/v1/search");
    url.searchParams.set("q", params.query);
    if (params.category) {
      url.searchParams.set("category", params.category);
    }
    if (params.limit) {
      url.searchParams.set("limit", String(params.limit));
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      console.warn(`Channel3 API responded with ${res.status}, using fixture candidates`);
      return getMockCandidates(params.query);
    }

    const data = await res.json();
    const rawProducts = Array.isArray(data.products) ? data.products : (Array.isArray(data) ? data : []);

    return rawProducts.map(mapRawToCandidate);
  } catch (err) {
    console.warn("Channel3 search request failed, falling back to mock candidates:", err);
    return getMockCandidates(params.query);
  }
}
