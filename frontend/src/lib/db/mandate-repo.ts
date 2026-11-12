import { type Mandate, MandateSchema, type MandateUpsert, MandateUpsertSchema } from '@/contracts/mandate';

export const DEFAULT_MANDATE: Mandate = {
  id: 'mandate-default',
  maxPerPurchase: 250,
  maxSessionTotal: 500,
  allowedCategories: ['electronics', 'audio', 'accessories'],
  blockedMerchants: ['ShadyGadgets', 'UnverifiedOutlet', 'ShadyStore', 'RogueSeller'],
  deliverBy: '2026-11-20',
  autoApproveBelow: 75,
  currency: 'USD',
  expiresAt: '2026-12-31T23:59:59.000Z',
};

const mandateStore = new Map<string, Mandate>([
  [DEFAULT_MANDATE.id, DEFAULT_MANDATE],
]);

let activeMandateId = DEFAULT_MANDATE.id;

export function getMandate(id: string): Mandate | undefined {
  return mandateStore.get(id);
}

export function getActiveMandate(): Mandate {
  const active = mandateStore.get(activeMandateId);
  return active ?? DEFAULT_MANDATE;
}

export function saveMandate(data: MandateUpsert): Mandate {
  const parsed = MandateUpsertSchema.parse(data);
  const id = parsed.id || `mandate-${Date.now()}`;
  const completeMandate: Mandate = MandateSchema.parse({
    ...parsed,
    id,
  });

  mandateStore.set(id, completeMandate);
  activeMandateId = id;
  return completeMandate;
}

export function listMandates(): Mandate[] {
  return Array.from(mandateStore.values());
}

export function resetMandates(): void {
  mandateStore.clear();
  mandateStore.set(DEFAULT_MANDATE.id, DEFAULT_MANDATE);
  activeMandateId = DEFAULT_MANDATE.id;
}
