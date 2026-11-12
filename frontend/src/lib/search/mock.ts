import fs from "node:fs";
import path from "node:path";
import { Candidate, CandidateSchema } from "@/contracts/product";

const FIXTURES_DIR = path.resolve(process.cwd(), "fixtures");

export function getMockCandidates(query: string = "headphones"): Candidate[] {
  // Kept in the signature so the mock source mirrors the live search API.
  void query;
  const filePath = path.join(FIXTURES_DIR, "channel3-headphones.json");

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.products)) {
        return data.products.map(mapRawToCandidate);
      }
    } catch (err) {
      console.warn("Failed to read fixture file:", err);
    }
  }

  // Fallback programmatic candidates
  return [
    {
      id: "ch3_prod_sony_wh1000xm4",
      title: "Sony WH-1000XM4 Wireless Premium Noise-Canceling Overhead Headphones",
      description: "Industry-leading noise canceling with Dual Noise Sensor technology. Up to 30-hour battery life.",
      price: 228.0,
      currency: "USD",
      merchant: "BestBuy",
      category: "Electronics",
      url: "https://bestbuy.com/site/sony-wh-1000xm4",
      imageUrl: "https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6405/6405255_sd.jpg",
      rating: 4.8,
      availability: "in_stock",
      shippingInfo: {
        cost: 0,
        estimatedDays: 2,
        deliverBy: new Date(Date.now() + 2 * 86400000).toISOString(),
        estimated: false,
      },
    },
    {
      id: "ch3_prod_bose_qc45",
      title: "Bose QuietComfort 45 Bluetooth Wireless Headphones",
      description: "High-fidelity audio with proprietary TriPort acoustic architecture. Quiet and Aware Modes.",
      price: 249.0,
      currency: "USD",
      merchant: "Target",
      category: "Electronics",
      url: "https://target.com/p/bose-quietcomfort-45",
      imageUrl: "https://target.scene7.com/is/image/Target/GUEST_boseqc45",
      rating: 4.7,
      availability: "in_stock",
      shippingInfo: {
        cost: 0,
        estimatedDays: 3,
        deliverBy: new Date(Date.now() + 3 * 86400000).toISOString(),
        estimated: false,
      },
    },
    {
      id: "ch3_prod_anker_q45",
      title: "Anker Soundcore Space Q45 Adaptive Active Noise Cancelling Headphones",
      description: "98% noise reduction system. Ultra-long 50-hour playtime in ANC mode.",
      price: 149.99,
      currency: "USD",
      merchant: "Amazon",
      category: "Electronics",
      url: "https://amazon.com/dp/B0B5VHRX7F",
      imageUrl: "https://m.media-amazon.com/images/I/space-q45.jpg",
      rating: 4.6,
      availability: "in_stock",
      shippingInfo: {
        cost: 5.99,
        estimatedDays: 1,
        deliverBy: new Date(Date.now() + 1 * 86400000).toISOString(),
        estimated: false,
      },
    },
  ];
}

export function mapRawToCandidate(raw: Record<string, unknown>): Candidate {
  const offers = Array.isArray(raw.offers)
    ? raw.offers.filter((offer): offer is Record<string, unknown> => Boolean(offer) && typeof offer === "object")
    : [];
  const preferredOffer = offers.find((offer) => offer.availability !== "out_of_stock") ?? offers[0];
  const shipping =
    raw.shipping && typeof raw.shipping === "object"
      ? (raw.shipping as Record<string, unknown>)
      : undefined;

  const brand = readString(raw.brand);
  const category = readString(raw.category) ?? readString(Array.isArray(raw.categories) ? raw.categories[0] : undefined);
  const imageUrl = readString(raw.image_url) ?? readString(raw.imageUrl) ?? readString(raw.image) ?? readImageUrl(raw.images);
  const price = readNumber(raw.price) ?? readNumber(preferredOffer?.price) ?? 0;

  return CandidateSchema.parse({
    id: String(raw.id || raw.product_id || `prod_${Math.random().toString(36).substring(7)}`),
    title: String(raw.title || raw.name || "Untitled Product"),
    description: String(raw.description || ""),
    price,
    currency: String(raw.currency || "USD"),
    merchant: String(raw.merchant || raw.store || readString(preferredOffer?.merchant) || readString(preferredOffer?.domain) || brand || "Merchant"),
    category: category || "General",
    url: String(raw.url || raw.buy_url || raw.link || preferredOffer?.url || "https://example.com"),
    imageUrl,
    rating: typeof raw.rating === "number" ? raw.rating : undefined,
    availability: raw.availability === "out_of_stock" ? "out_of_stock" : "in_stock",
    shippingInfo: shipping
      ? {
          cost: Number(shipping.cost ?? shipping.price ?? 0),
          estimatedDays: typeof (shipping.estimated_days ?? shipping.estimatedDays) === "number"
            ? (shipping.estimated_days ?? shipping.estimatedDays) as number
            : undefined,
          deliverBy: typeof (shipping.delivery_date ?? shipping.deliverBy) === "string"
            ? (shipping.delivery_date ?? shipping.deliverBy) as string
            : undefined,
          estimated: Boolean(shipping.estimated ?? false),
        }
      : { cost: 0, estimated: true },
  });
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["name", "title", "label", "value", "url", "domain"]) {
      if (typeof record[key] === "string") return record[key] as string;
    }
  }
  return undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["price", "amount", "value", "current"]) {
      const number = readNumber(record[key]);
      if (number !== undefined) return number;
    }
  }
  return undefined;
}

function readImageUrl(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  return readString(value[0]);
}
