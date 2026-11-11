import { Candidate } from "@/contracts/product.js";
import { ParsedIntent } from "@/contracts/api.js";

export function rankCandidates(
  candidates: Candidate[],
  intent?: ParsedIntent
): Candidate[] {
  const scored = candidates.map((candidate) => {
    let score = 50; // base score

    // 1. Rating contribution (0-25 pts)
    if (candidate.rating) {
      score += (candidate.rating / 5.0) * 25;
    } else {
      score += 15;
    }

    // 2. Budget headroom / affordability (0-25 pts)
    if (intent?.maxPrice) {
      const remaining = intent.maxPrice - candidate.price;
      if (remaining >= 0) {
        // Reward staying within budget, small reward for saving
        const savingsRatio = Math.min(remaining / intent.maxPrice, 1.0);
        score += 15 + savingsRatio * 10;
      }
    } else {
      score += 15;
    }

    // 3. Shipping speed & cost (0-25 pts)
    const shipping = candidate.shippingInfo;
    if (shipping) {
      if (shipping.cost === 0) {
        score += 10; // Free shipping bonus
      }
      if (shipping.estimatedDays && shipping.estimatedDays <= 2) {
        score += 15; // Fast delivery bonus
      } else if (shipping.estimatedDays && shipping.estimatedDays <= 4) {
        score += 8;
      }
    }

    // 4. Feature matching in title/description (0-25 pts)
    if (intent?.features && intent.features.length > 0) {
      const text = `${candidate.title} ${candidate.description}`.toLowerCase();
      let matches = 0;
      for (const feat of intent.features) {
        if (text.includes(feat.toLowerCase())) {
          matches++;
        }
      }
      const matchRatio = matches / intent.features.length;
      score += matchRatio * 25;
    }

    return {
      ...candidate,
      score: Math.round(score * 10) / 10,
    };
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
