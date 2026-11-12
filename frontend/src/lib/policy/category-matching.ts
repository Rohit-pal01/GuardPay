/**
 * Product search providers return granular labels (for example, "Over-Ear
 * Headphones"), while a buyer's mandate usually uses a broader family such as
 * "electronics". This maps only well-known child labels to their parent
 * families; unknown categories remain disallowed unless explicitly listed.
 */
const CATEGORY_FAMILIES: Record<string, string[]> = {
  electronics: [
    "electronics", "audio", "headphones", "earbuds", "speaker", "microphone",
    "phone", "smartphone", "laptop", "computer", "tablet", "monitor", "camera",
    "television", "tv", "gaming", "console", "wearable",
  ],
  audio: ["audio", "headphones", "earbuds", "speaker", "microphone", "soundbar"],
  accessories: ["accessories", "accessory", "cable", "charger", "adapter", "case", "cover", "stand"],
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function belongsToFamily(category: string, family: string): boolean {
  const words = normalize(category).split(" ");
  return (CATEGORY_FAMILIES[family] ?? []).some((keyword) => words.includes(keyword));
}

/** Returns whether an exact or known parent-category allowance covers a category. */
export function isCategoryAllowed(category: string, allowedCategories: string[]): boolean {
  const normalizedCategory = normalize(category);
  return allowedCategories.some((allowed) => {
    const normalizedAllowed = normalize(allowed);
    return normalizedAllowed === normalizedCategory || belongsToFamily(category, normalizedAllowed);
  });
}
