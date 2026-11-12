import { and, eq } from "drizzle-orm";
import type { Cart, PaymentOrder } from "../../contracts";
import { CartSchema, PaymentOrderSchema } from "../../contracts";
import type { Backend } from "./client";
import { cartApprovals, carts, paymentOrders } from "./schema";

export interface CartRepo {
  create(cart: Cart): Promise<Cart>;
  get(id: string): Promise<Cart | null>;
  /** FR-A2-25: approval is bound to the exact amount the human saw. */
  recordApproval(cartId: string, amountCents: number): Promise<void>;
  hasApproval(cartId: string, amountCents: number): Promise<boolean>;
}

/** PaymentOrders from A1 are persisted through the same layer (FR-A2-6). */
export interface OrderRepo {
  save(sessionId: string, order: PaymentOrder): Promise<void>;
  get(paypalOrderId: string): Promise<PaymentOrder | null>;
  getByCart(cartId: string): Promise<PaymentOrder | null>;
  /** USD captured so far in a session (feeds the session cap). */
  capturedTotal(sessionId: string): Promise<number>;
}

export function createCartRepo(b: Backend): CartRepo {
  if (b.kind === "memory") {
    return {
      async create(c) {
        const v = CartSchema.parse(c);
        b.store.carts.set(v.id, v);
        return v;
      },
      async get(id) {
        return b.store.carts.get(id) ?? null;
      },
      async recordApproval(id, cents) {
        b.store.approvals.set(id, cents);
      },
      async hasApproval(id, cents) {
        return b.store.approvals.get(id) === cents;
      },
    };
  }
  return {
    async create(c) {
      const v = CartSchema.parse(c);
      await b.db
        .insert(carts)
        .values({ id: v.id, sessionId: v.sessionId, data: v });
      return v;
    },
    async get(id) {
      const [r] = await b.db.select().from(carts).where(eq(carts.id, id));
      return r ? CartSchema.parse(r.data) : null;
    },
    async recordApproval(id, cents) {
      await b.db
        .insert(cartApprovals)
        .values({ cartId: id, amountCents: cents })
        .onConflictDoUpdate({
          target: cartApprovals.cartId,
          set: { amountCents: cents, approvedAt: new Date() },
        });
    },
    async hasApproval(id, cents) {
      const [r] = await b.db
        .select()
        .from(cartApprovals)
        .where(
          and(
            eq(cartApprovals.cartId, id),
            eq(cartApprovals.amountCents, cents),
          ),
        );
      return !!r;
    },
  };
}

export function createOrderRepo(b: Backend): OrderRepo {
  if (b.kind === "memory") {
    return {
      async save(sessionId, o) {
        b.store.orders.set(o.paypalOrderId, {
          sessionId,
          order: PaymentOrderSchema.parse(o),
        });
      },
      async get(id) {
        return b.store.orders.get(id)?.order ?? null;
      },
      async getByCart(cartId) {
        return (
          [...b.store.orders.values()]
            .reverse()
            .find((r) => r.order.cartId === cartId)?.order ?? null
        );
      },
      async capturedTotal(sessionId) {
        return (
          [...b.store.orders.values()]
            .filter(
              (r) => r.sessionId === sessionId && r.order.status === "captured",
            )
            .reduce((s, r) => s + Math.round(r.order.amount * 100), 0) / 100
        );
      },
    };
  }
  return {
    async save(sessionId, o) {
      const v = PaymentOrderSchema.parse(o);
      await b.db
        .insert(paymentOrders)
        .values({
          paypalOrderId: v.paypalOrderId,
          cartId: v.cartId,
          sessionId,
          status: v.status,
          data: v,
        })
        .onConflictDoUpdate({
          target: paymentOrders.paypalOrderId,
          set: { status: v.status, data: v },
        });
    },
    async get(id) {
      const [r] = await b.db
        .select()
        .from(paymentOrders)
        .where(eq(paymentOrders.paypalOrderId, id));
      return r ? PaymentOrderSchema.parse(r.data) : null;
    },
    async getByCart(cartId) {
      const rows = await b.db
        .select()
        .from(paymentOrders)
        .where(eq(paymentOrders.cartId, cartId));
      const r = rows[rows.length - 1];
      return r ? PaymentOrderSchema.parse(r.data) : null;
    },
    async capturedTotal(sessionId) {
      const rows = await b.db
        .select()
        .from(paymentOrders)
        .where(
          and(
            eq(paymentOrders.sessionId, sessionId),
            eq(paymentOrders.status, "captured"),
          ),
        );
      return (
        rows.reduce((s, r) => s + Math.round(r.data.amount * 100), 0) / 100
      );
    },
  };
}
