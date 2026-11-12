import type {
  AgentEvent,
  Cart,
  Mandate,
  PaymentOrder,
  PolicyDecision,
} from "../../contracts";
import { getRepos, type Repos } from "../db";
import { paypal as defaultPaypal, type PaypalClient } from "../paypal";
import { checkPolicy } from "./engine";
import { cartTotalCents, type PolicyContext } from "./rules";

/**
 * The safety gate (NFR-1). The ONLY code path that calls createOrder / captureOrder (FR-A2-18).
 * B must never import lib/paypal; A1's order routes call this executor (FR-A2-22/23).
 */
export interface ExecutorResult {
  status:
    | "order_created"
    | "payment_captured"
    | "awaiting_approval"
    | "blocked"
    | "error";
  reasons: string[];
  decision?: PolicyDecision;
  order?: PaymentOrder;
}
export interface ExecutorDeps {
  paypal: PaypalClient;
  repos: Repos;
  now?: () => Date;
  /** Live USD total for a Cart at capture time (FR-A2-14). Defaults to the Cart's own total (no-op) until B/C wire a price source. */
  getCurrentTotal?: (cart: Cart) => Promise<number>;
}
export type Executor = ReturnType<typeof createExecutor>;

const BLOCKING_CODES = new Set(["declined", "expired", "duplicate_capture"]);

export function createExecutor(deps: ExecutorDeps) {
  const { paypal, repos } = deps;
  const now = deps.now ?? (() => new Date());
  const emit = (
    sessionId: string,
    type: AgentEvent["type"],
    message: string,
    data?: Record<string, unknown>,
  ) =>
    repos.audit.append({
      sessionId,
      type,
      at: now().toISOString(),
      message,
      ...(data ? { data } : {}),
    });

  const stop = async (
    cart: Cart,
    status: "blocked" | "error",
    reasons: string[],
    extra?: Partial<ExecutorResult>,
  ): Promise<ExecutorResult> => {
    await emit(cart.sessionId, status, reasons.join(" "), {
      cartId: cart.id,
      reasons,
    });
    return { status, reasons, ...extra };
  };

  /** FR-A2-29: typed PayPal errors become readable blocked/error events. */
  const fromPaypalError = (cart: Cart, err: unknown) => {
    const code = (err as { code?: string } | null)?.code ?? "unknown";
    const known: Record<string, string> = {
      declined: "PayPal declined the payment.",
      expired: "The PayPal order expired.",
      duplicate_capture: "This order was already captured.",
    };
    return BLOCKING_CODES.has(code)
      ? stop(cart, "blocked", [known[code]!])
      : stop(cart, "error", ["PayPal request failed."]);
  };

  async function load(cartId: string) {
    const cart = await repos.carts.get(cartId);
    if (!cart)
      return {
        error: {
          status: "error",
          reasons: ["Cart not found."],
        } as ExecutorResult,
      };
    const mandate = await repos.mandates.get(cart.mandateId);
    if (!mandate)
      return {
        error: await stop(cart, "error", ["Mandate not found for this Cart."]),
      };
    return { cart, mandate };
  }

  /** Policy check + approval check. Returns a stop result or the decision to proceed with. */
  async function gate(
    cart: Cart,
    mandate: Mandate,
    extra: Partial<PolicyContext> = {},
  ) {
    const sessionSpent = await repos.orders.capturedTotal(cart.sessionId);
    const decision = checkPolicy(cart, mandate, {
      now: now(),
      sessionSpent,
      ...extra,
    });
    await emit(
      cart.sessionId,
      "policy_checked",
      `Policy verdict: ${decision.verdict}.`,
      {
        cartId: cart.id,
        verdict: decision.verdict,
        ruleIds: decision.ruleIds,
        reasons: decision.reasons,
      },
    );
    if (decision.verdict === "deny")
      return {
        stopped: await stop(cart, "blocked", decision.reasons, { decision }),
      };
    if (
      decision.verdict === "needs_approval" &&
      !(await repos.carts.hasApproval(cart.id, cartTotalCents(cart)))
    ) {
      await emit(
        cart.sessionId,
        "awaiting_approval",
        "Waiting for human approval.",
        { cartId: cart.id },
      );
      return {
        stopped: {
          status: "awaiting_approval",
          reasons: decision.reasons,
          decision,
        } as ExecutorResult,
      };
    }
    return { decision };
  }

  return {
    /** Human approval (FR-A2-25). Bound to the exact Cart amount; a deny verdict is never overridden by this. */
    async recordApproval(
      cartId: string,
    ): Promise<{ approved: boolean; reason?: string }> {
      const cart = await repos.carts.get(cartId);
      if (!cart) return { approved: false, reason: "Cart not found." };
      await repos.carts.recordApproval(cartId, cartTotalCents(cart));
      await emit(cart.sessionId, "approved", "Human approval recorded.", {
        cartId,
      });
      return { approved: true };
    },

    async createPaymentOrder(cartId: string): Promise<ExecutorResult> {
      const l = await load(cartId);
      if ("error" in l) return l.error!;
      const { cart, mandate } = l as { cart: Cart; mandate: Mandate };

      const existing = await repos.orders.getByCart(cart.id); // idempotent: no duplicate orders per Cart
      if (existing && existing.status !== "failed")
        return {
          status: "order_created",
          reasons: ["Order already exists for this Cart."],
          order: existing,
        };

      const g = await gate(cart, mandate);
      if (g.stopped) return g.stopped;

      let order: PaymentOrder;
      try {
        order = await paypal.createOrder(cart);
      } catch (e) {
        return fromPaypalError(cart, e);
      }

      // FR-A2-15 / FR-A2-27: PayPal's amount must equal the Cart (or agreed) price.
      const check = checkPolicy(cart, mandate, {
        now: now(),
        sessionSpent: await repos.orders.capturedTotal(cart.sessionId),
        orderAmount: order.amount,
      });
      if (check.verdict === "deny") {
        await repos.orders.save(cart.sessionId, { ...order, status: "failed" });
        return stop(cart, "blocked", check.reasons, { decision: check });
      }
      await repos.orders.save(cart.sessionId, order);
      await emit(
        cart.sessionId,
        "order_created",
        `PayPal order ${order.paypalOrderId} created.`,
        {
          cartId: cart.id,
          paypalOrderId: order.paypalOrderId,
          amount: order.amount,
        },
      );
      return {
        status: "order_created",
        reasons: [],
        decision: g.decision,
        order,
      };
    },

    async capturePaymentOrder(cartId: string): Promise<ExecutorResult> {
      const l = await load(cartId);
      if ("error" in l) return l.error!;
      const { cart, mandate } = l as { cart: Cart; mandate: Mandate };

      const open = await repos.orders.getByCart(cart.id);
      if (!open || open.status !== "created")
        return stop(cart, "blocked", [
          "No open order to capture for this Cart.",
        ]);

      let remote: PaymentOrder;
      try {
        remote = await paypal.getOrder(open.paypalOrderId);
      } catch (e) {
        return fromPaypalError(cart, e);
      }
      if (remote.cartId !== cart.id)
        return stop(cart, "blocked", [
          "PayPal order does not belong to this Cart.",
        ]);

      // FR-A2-20: re-check price + amount right before money moves.
      const currentTotal = deps.getCurrentTotal
        ? await deps.getCurrentTotal(cart)
        : cartTotalCents(cart) / 100;
      const g = await gate(cart, mandate, {
        currentTotal,
        orderAmount: remote.amount,
      });
      if (g.stopped) return g.stopped;

      let captured: PaymentOrder;
      try {
        captured = await paypal.captureOrder(open.paypalOrderId);
      } catch (e) {
        return fromPaypalError(cart, e);
      }
      await repos.orders.save(cart.sessionId, captured);
      await emit(cart.sessionId, "payment_captured", "Payment captured.", {
        cartId: cart.id,
        paypalOrderId: captured.paypalOrderId,
        captureId: captured.captureId,
        amount: captured.amount,
      });
      return {
        status: "payment_captured",
        reasons: [],
        decision: g.decision,
        order: captured,
      };
    },
  };
}

let singleton: Executor | undefined;
/** Production wiring: Neon (or memory fallback) + A1's PayPal module. */
export function getExecutor(): Executor {
  return (singleton ??= createExecutor({
    paypal: defaultPaypal,
    repos: getRepos(),
  }));
}
