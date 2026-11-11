import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import type { AuditEvent, Cart, Mandate, PaymentOrder } from '../../contracts';

export type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null | undefined;
/** Neon Postgres via DATABASE_URL, or null when unset (callers fall back to memory). */
export function getDb(): Db | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? drizzle(neon(url), { schema }) : null;
  return cached;
}

// ---- in-memory fallback (FR-A2-5): local/emergency only, NOT durable ----
export interface MemoryStore {
  mandates: Map<string, Mandate>;
  carts: Map<string, Cart>;
  approvals: Map<string, number>;
  orders: Map<string, { sessionId: string; order: PaymentOrder }>;
  events: AuditEvent[];
}
export const createMemoryStore = (): MemoryStore => ({
  mandates: new Map(), carts: new Map(), approvals: new Map(), orders: new Map(), events: [],
});
const g = globalThis as unknown as { __mandateStore?: MemoryStore };
/** Shared across hot reloads in dev. */
export const getMemoryStore = (): MemoryStore => (g.__mandateStore ??= createMemoryStore());

export type Backend = { kind: 'pg'; db: Db } | { kind: 'memory'; store: MemoryStore };
export function getBackend(): Backend {
  const db = getDb();
  return db ? { kind: 'pg', db } : { kind: 'memory', store: getMemoryStore() };
}
