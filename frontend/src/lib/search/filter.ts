import { Candidate } from "@/contracts/product";
import { Mandate } from "@/contracts/mandate";
import { ParsedIntent } from "@/contracts/api";
import { isCategoryAllowed } from "@/lib/policy/category-matching";

export interface FilterOptions {
  mandate?: Mandate;
  intent?: ParsedIntent;
}

export interface FilterResult {
  passed: Candidate[];
  filteredOut: Array<{ candidate: Candidate; reason: string }>;
}

export function filterCandidates(
  candidates: Candidate[],
  options: FilterOptions = {}
): FilterResult {
  const passed: Candidate[] = [];
  const filteredOut: Array<{ candidate: Candidate; reason: string }> = [];

  const maxPriceLimit = Math.min(
    options.mandate?.maxPerPurchase ?? Infinity,
    options.intent?.maxPrice ?? Infinity
  );

  const blockedMerchants = new Set(
    (options.mandate?.blockedMerchants ?? []).map((m) => m.toLowerCase())
  );

  const allowedCategories = options.mandate?.allowedCategories ?? [];

  const targetDelivery = options.mandate?.deliverBy || options.intent?.deliverBy;
  const targetDate = targetDelivery ? new Date(targetDelivery).getTime() : null;

  for (const candidate of candidates) {
    // 1. Availability check
    if (candidate.availability === "out_of_stock") {
      filteredOut.push({ candidate, reason: "Product is out of stock" });
      continue;
    }

    // 2. Total cost cap check (price + shipping)
    const shippingCost = candidate.shippingInfo?.cost ?? 0;
    const totalCost = candidate.price + shippingCost;
    if (totalCost > maxPriceLimit) {
      filteredOut.push({
        candidate,
        reason: `Total cost ($${totalCost.toFixed(2)}) exceeds budget ceiling ($${maxPriceLimit.toFixed(2)})`,
      });
      continue;
    }

    // 3. Blocked merchant check
    if (blockedMerchants.has(candidate.merchant.toLowerCase())) {
      filteredOut.push({
        candidate,
        reason: `Merchant '${candidate.merchant}' is on the blocked merchants list`,
      });
      continue;
    }

    // 4. Allowed categories check (if configured)
    if (allowedCategories.length > 0 && !isCategoryAllowed(candidate.category, allowedCategories)) {
      filteredOut.push({
        candidate,
        reason: `Category '${candidate.category}' is not in allowed categories`,
      });
      continue;
    }

    // 5. Hard delivery deadline check (if candidate has a known delivery date)
    if (targetDate && candidate.shippingInfo?.deliverBy && !candidate.shippingInfo.estimated) {
      const candidateDeliveryTime = new Date(candidate.shippingInfo.deliverBy).getTime();
      if (!isNaN(candidateDeliveryTime) && candidateDeliveryTime > targetDate) {
        filteredOut.push({
          candidate,
          reason: `Delivery date (${candidate.shippingInfo.deliverBy}) is after deadline (${targetDelivery})`,
        });
        continue;
      }
    }

    passed.push(candidate);
  }

  return { passed, filteredOut };
}
