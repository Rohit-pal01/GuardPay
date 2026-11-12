import { Candidate } from "@/contracts/product";
import { getMockCandidates, mapRawToCandidate } from "./mock";

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
    const res = await fetch("https://api.trychannel3.com/v1/search", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: params.query,
        limit: params.limit ?? 5,
      }),
    });

    if (!res.ok) {
      console.warn(`Channel3 API responded with ${res.status}, using fixture candidates`);
      return getMockCandidates(params.query);
    }

    const data = await res.json();
    const rawProducts = Array.isArray(data.data)
      ? data.data
      : Array.isArray(data.products)
        ? data.products
        : Array.isArray(data)
          ? data
          : [];

    return rawProducts.map(mapRawToCandidate);
  } catch (err) {
    console.warn("Channel3 search request failed, falling back to mock candidates:", err);
    return getMockCandidates(params.query);
  }
}
