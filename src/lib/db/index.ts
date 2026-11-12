import { createMemoryStore, getBackend, type Backend } from "./client";
import { createAuditRepo, type AuditRepo } from "./audit-repo";
import {
  createCartRepo,
  createOrderRepo,
  type CartRepo,
  type OrderRepo,
} from "./cart-repo";
import { createMandateRepo, type MandateRepo } from "./mandate-repo";

export interface Repos {
  audit: AuditRepo;
  carts: CartRepo;
  orders: OrderRepo;
  mandates: MandateRepo;
}

export const createRepos = (b: Backend): Repos => ({
  audit: createAuditRepo(b),
  carts: createCartRepo(b),
  orders: createOrderRepo(b),
  mandates: createMandateRepo(b),
});
/** Fresh isolated in-memory repos (tests). */
export const createMemoryRepos = (): Repos =>
  createRepos({ kind: "memory", store: createMemoryStore() });
/** Neon if DATABASE_URL is set, otherwise the in-memory fallback. */
export const getRepos = (): Repos => createRepos(getBackend());
export type { AuditRepo, CartRepo, OrderRepo, MandateRepo };
