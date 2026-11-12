import { eq } from "drizzle-orm";
import type { Mandate } from "../../contracts";
import { MandateSchema } from "../../contracts";
import type { Backend } from "./client";
import { mandates } from "./schema";

export interface MandateRepo {
  create(mandate: Mandate): Promise<Mandate>;
  get(id: string): Promise<Mandate | null>;
}

export function createMandateRepo(b: Backend): MandateRepo {
  if (b.kind === "memory") {
    return {
      async create(m) {
        const v = MandateSchema.parse(m);
        b.store.mandates.set(v.id, v);
        return v;
      },
      async get(id) {
        return b.store.mandates.get(id) ?? null;
      },
    };
  }
  return {
    async create(m) {
      const v = MandateSchema.parse(m);
      await b.db.insert(mandates).values({ id: v.id, data: v });
      return v;
    },
    async get(id) {
      const [r] = await b.db.select().from(mandates).where(eq(mandates.id, id));
      return r ? MandateSchema.parse(r.data) : null;
    },
  };
}
