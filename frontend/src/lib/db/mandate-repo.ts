import { desc, eq } from 'drizzle-orm';
import { type Mandate, MandateSchema, type MandateUpsert, MandateUpsertSchema } from '@/contracts/mandate';
import { db, isDatabaseEnabled } from './client';
import { mandates } from './schema';

export const DEFAULT_MANDATE: Mandate = {
  id: 'mandate-default', maxPerPurchase: 250, maxSessionTotal: 500,
  allowedCategories: ['electronics', 'audio', 'accessories'],
  blockedMerchants: ['ShadyGadgets', 'UnverifiedOutlet', 'ShadyStore', 'RogueSeller'],
  deliverBy: '2026-11-20', autoApproveBelow: 75, currency: 'USD', expiresAt: '2026-12-31T23:59:59.000Z',
};

const mandateStore = new Map<string, Mandate>([[DEFAULT_MANDATE.id, DEFAULT_MANDATE]]);
let activeMandateId = DEFAULT_MANDATE.id;

function recordToMandate(record: typeof mandates.$inferSelect): Mandate {
  return MandateSchema.parse({
    ...record,
    maxPerPurchase: Number(record.maxPerPurchase),
    maxSessionTotal: Number(record.maxSessionTotal),
    autoApproveBelow: Number(record.autoApproveBelow),
  });
}

export async function getMandate(id: string): Promise<Mandate | undefined> {
  if (!isDatabaseEnabled) return mandateStore.get(id);
  const [record] = await db!.select().from(mandates).where(eq(mandates.id, id)).limit(1);
  return record ? recordToMandate(record) : undefined;
}

export async function getActiveMandate(): Promise<Mandate> {
  if (!isDatabaseEnabled) return mandateStore.get(activeMandateId) ?? DEFAULT_MANDATE;
  const [record] = await db!.select().from(mandates).orderBy(desc(mandates.updatedAt)).limit(1);
  return record ? recordToMandate(record) : saveMandate(DEFAULT_MANDATE);
}

export async function saveMandate(data: MandateUpsert): Promise<Mandate> {
  const parsed = MandateUpsertSchema.parse(data);
  const mandate = MandateSchema.parse({ ...parsed, id: parsed.id || `mandate-${Date.now()}` });
  if (!isDatabaseEnabled) {
    mandateStore.set(mandate.id, mandate);
    activeMandateId = mandate.id;
    return mandate;
  }
  const now = new Date().toISOString();
  await db!.insert(mandates).values({
    ...mandate, maxPerPurchase: String(mandate.maxPerPurchase), maxSessionTotal: String(mandate.maxSessionTotal),
    autoApproveBelow: String(mandate.autoApproveBelow), createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({ target: mandates.id, set: {
    maxPerPurchase: String(mandate.maxPerPurchase), maxSessionTotal: String(mandate.maxSessionTotal),
    allowedCategories: mandate.allowedCategories, blockedMerchants: mandate.blockedMerchants,
    deliverBy: mandate.deliverBy, autoApproveBelow: String(mandate.autoApproveBelow),
    currency: mandate.currency, expiresAt: mandate.expiresAt, updatedAt: now,
  } });
  return mandate;
}

export async function listMandates(): Promise<Mandate[]> {
  if (!isDatabaseEnabled) return Array.from(mandateStore.values());
  return (await db!.select().from(mandates).orderBy(desc(mandates.updatedAt))).map(recordToMandate);
}

export async function resetMandates(): Promise<void> {
  if (!isDatabaseEnabled) {
    mandateStore.clear(); mandateStore.set(DEFAULT_MANDATE.id, DEFAULT_MANDATE); activeMandateId = DEFAULT_MANDATE.id;
  }
}
