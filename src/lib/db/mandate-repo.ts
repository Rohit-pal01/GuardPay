import { Mandate, MandateSchema } from "@/contracts/mandate.js";

const DEFAULT_MANDATE: Mandate = {
  id: "mandate_demo_01",
  maxPerPurchase: 250.0,
  maxSessionTotal: 1000.0,
  allowedCategories: ["Electronics", "Audio", "General"],
  blockedMerchants: ["RogueSeller", "ShadyStore"],
  deliverBy: new Date(Date.now() + 3 * 86400000).toISOString(),
  autoApproveBelow: 50.0,
  currency: "USD",
  expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
};

const mandateStore = new Map<string, Mandate>([
  [DEFAULT_MANDATE.id, DEFAULT_MANDATE],
]);

export function getMandate(id: string): Mandate | undefined {
  return mandateStore.get(id) || DEFAULT_MANDATE;
}

export function saveMandate(mandate: Mandate): Mandate {
  const parsed = MandateSchema.parse(mandate);
  mandateStore.set(parsed.id, parsed);
  return parsed;
}

export function listMandates(): Mandate[] {
  return Array.from(mandateStore.values());
}

