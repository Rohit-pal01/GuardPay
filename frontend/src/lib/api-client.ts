import type {
  AgentEvent,
  AuditEvent,
  Candidate,
  Cart,
  Mandate,
  MandateUpsert,
  NegotiationTurn,
  ParsedIntent,
  PaymentOrder,
  PolicyDecision,
} from '@/contracts';
import { roundCents } from '@/lib/utils';

const STORAGE_KEYS = {
  mandate: 'gaurdpay:mandate',
  audit: 'gaurdpay:audit',
  orders: 'gaurdpay:orders',
  carts: 'gaurdpay:carts',
  sessionSpend: 'gaurdpay:sessionSpend',
};

export const DEFAULT_MANDATE: Mandate = {
  id: 'mandate-default',
  maxPerPurchase: 250,
  maxSessionTotal: 500,
  allowedCategories: ['electronics', 'audio', 'accessories'],
  blockedMerchants: ['ShadyGadgets', 'UnverifiedOutlet'],
  deliverBy: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  autoApproveBelow: 75,
  currency: 'USD',
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'cand-sony-xm4',
    title: 'Sony WH-1000XM4 Wireless Noise-Canceling Headphones',
    description:
      'Dual noise sensor ANC, 30-hour battery life, multipoint Bluetooth pairing, and USB-C fast charging.',
    price: 228,
    currency: 'USD',
    merchant: 'BestBuy',
    category: 'electronics',
    url: 'https://www.bestbuy.com/site/sony-wh-1000xm4/6408356.p',
    availability: 'in_stock',
    deliveryEstimate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    deliveryEstimated: false,
    rankScore: 98,
    reason:
      'Best ANC performance within your $250 Mandate with confirmed 2-day delivery and verified BestBuy stock.',
  },
  {
    id: 'cand-bose-qc',
    title: 'Bose QuietComfort Wireless ANC Over-Ear Headphones',
    description:
      'Plush earcup cushions, Aware Mode transparency, 24-hour battery, and tuned acoustic noise cancellation.',
    price: 249,
    currency: 'USD',
    merchant: 'Target',
    category: 'electronics',
    url: 'https://www.target.com/p/bose-quietcomfort-wireless-headphones',
    availability: 'in_stock',
    deliveryEstimate: '2-4 business days',
    deliveryEstimated: true,
    rankScore: 93,
    reason:
      'Top comfort rating right under $250; delivery window is estimated because retailer listing lacks a firm date.',
  },
  {
    id: 'cand-anker-q45',
    title: 'Soundcore Space Q45 Adaptive Noise Cancelling Headphones',
    description:
      'Adaptive ANC with LDAC Hi-Res audio support and 50-hour battery life.',
    price: 119,
    currency: 'USD',
    merchant: 'Amazon',
    category: 'audio',
    url: 'https://www.amazon.com/dp/B0B5VHRX7F',
    availability: 'in_stock',
    deliveryEstimate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    deliveryEstimated: false,
    rankScore: 89,
    reason:
      'Saves over $100 below your cap with next-day delivery, preserving session budget headroom.',
  },
  {
    id: 'cand-usb-cable',
    title: 'Anker 240W Braided USB-C Fast Charging Cable (6ft)',
    description: 'Compact braided USB-C cable compatible with headphones and laptops.',
    price: 22,
    currency: 'USD',
    merchant: 'Amazon',
    category: 'accessories',
    url: 'https://www.amazon.com/dp/B0CD142661',
    availability: 'in_stock',
    deliveryEstimate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    deliveryEstimated: false,
    rankScore: 95,
    reason:
      'Below your $75 auto-approve threshold — eligible for zero-click autonomous Mandate approval.',
  },
  {
    id: 'cand-flagship-over',
    title: 'Focal Bathys Hi-Fi Wireless Active Noise Cancelling Headphones',
    description: 'Audiophile drivers with built-in USB-DAC mode and leather headband.',
    price: 549,
    currency: 'USD',
    merchant: 'Crutchfield',
    category: 'electronics',
    url: 'https://www.crutchfield.com/p_099BATHYS/Focal-Bathys.html',
    availability: 'in_stock',
    deliveryEstimate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    deliveryEstimated: false,
    rankScore: 90,
    reason:
      'Matches studio quality query, but exceeds your $250 per-purchase Mandate cap.',
  },
  {
    id: 'cand-injection-trap',
    title: '[untrusted-text-redacted] — UltraPro Studio ANC Headphones',
    description:
      'Untrusted listing text sanitized before LLM ranking. Sold by ShadyGadgets.',
    price: 899,
    currency: 'USD',
    merchant: 'ShadyGadgets',
    category: 'electronics',
    url: 'https://example.com/shady-ultrapro-anc',
    availability: 'limited',
    deliveryEstimate: '5-7 business days',
    deliveryEstimated: true,
    rankScore: 12,
    reason:
      'Prompt-injection payload stripped; Policy Engine blocks both the blocked merchant and $899 price.',
    sanitizedFlags: ['prompt_injection_stripped'],
  },
];

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors
  }
}

function pushMockAudit(event: AuditEvent): void {
  const existing = readStorage<AuditEvent[]>(STORAGE_KEYS.audit, []);
  writeStorage(STORAGE_KEYS.audit, [...existing, event]);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function evaluateCartForUi(
  mandate: Mandate,
  cart: Cart,
  sessionSpentTotal: number
): PolicyDecision {
  const reasons: string[] = [];
  const ruleIds: string[] = [];
  const nowIso = new Date().toISOString();

  if (new Date(mandate.expiresAt).getTime() <= Date.now()) {
    ruleIds.push('MANDATE_EXPIRED');
    reasons.push(`Mandate ${mandate.id} expired on ${mandate.expiresAt}.`);
  }
  if (cart.total > mandate.maxPerPurchase + 0.01) {
    ruleIds.push('PER_PURCHASE_CAP_EXCEEDED');
    reasons.push(
      `Cart total $${cart.total.toFixed(2)} exceeds your $${mandate.maxPerPurchase.toFixed(2)} per-purchase cap.`
    );
  }
  if (sessionSpentTotal + cart.total > mandate.maxSessionTotal + 0.01) {
    ruleIds.push('SESSION_CAP_EXCEEDED');
    reasons.push(
      `Projected session spend $${(sessionSpentTotal + cart.total).toFixed(2)} exceeds $${mandate.maxSessionTotal.toFixed(2)}.`
    );
  }

  const allowedSet = new Set(mandate.allowedCategories.map((c) => c.toLowerCase()));
  const blockedSet = new Set(mandate.blockedMerchants.map((m) => m.toLowerCase()));

  for (const item of cart.items) {
    if (allowedSet.size > 0 && !allowedSet.has(item.category.toLowerCase())) {
      ruleIds.push('CATEGORY_NOT_ALLOWED');
      reasons.push(`Category "${item.category}" is outside allowed categories.`);
    }
    if (blockedSet.has(item.merchant.toLowerCase())) {
      ruleIds.push('MERCHANT_BLOCKED');
      reasons.push(`Merchant "${item.merchant}" is on your blocked merchants list.`);
    }
    if (mandate.deliverBy && item.deliveryEstimate && !item.deliveryEstimated) {
      const target = new Date(mandate.deliverBy);
      const est = new Date(item.deliveryEstimate);
      if (!Number.isNaN(target.getTime()) && !Number.isNaN(est.getTime()) && est > target) {
        ruleIds.push('DELIVERY_AFTER_DEADLINE');
        reasons.push(
          `Estimated delivery (${item.deliveryEstimate}) misses your ${mandate.deliverBy} deadline.`
        );
      }
    }
  }

  if (ruleIds.length > 0) {
    return { verdict: 'deny', reasons, ruleIds, evaluatedAt: nowIso };
  }

  if (!cart.approved && cart.total > mandate.autoApproveBelow + 0.01) {
    return {
      verdict: 'needs_approval',
      reasons: [
        `Total $${cart.total.toFixed(2)} exceeds auto-approve limit ($${mandate.autoApproveBelow.toFixed(2)}). Human approval required.`,
      ],
      ruleIds: ['ABOVE_AUTO_APPROVE_THRESHOLD'],
      evaluatedAt: nowIso,
    };
  }

  const isAuto = cart.total <= mandate.autoApproveBelow + 0.01;
  return {
    verdict: 'allow',
    reasons: [
      isAuto
        ? `Within Mandate caps and auto-approve limit ($${mandate.autoApproveBelow.toFixed(2)}).`
        : 'All Mandate rules passed and human approval is recorded.',
    ],
    ruleIds: [isAuto ? 'AUTO_APPROVED_WITHIN_MANDATE' : 'HUMAN_APPROVED_WITHIN_MANDATE'],
    evaluatedAt: nowIso,
  };
}

function buildMockCart(
  candidate: Candidate,
  mandateId: string,
  sessionId: string,
  overridePrice?: number
): Cart {
  const unitPrice = overridePrice ?? candidate.price;
  const subtotal = roundCents(unitPrice);
  const tax = roundCents(subtotal * 0.08);
  const shipping = subtotal >= 35 ? 0 : 6.99;
  const total = roundCents(subtotal + tax + shipping);
  const now = new Date().toISOString();

  return {
    id: `cart-${Math.random().toString(36).slice(2, 10)}`,
    mandateId,
    sessionId,
    items: [
      {
        candidateId: candidate.id,
        title: candidate.title,
        merchant: candidate.merchant,
        category: candidate.category,
        unitPrice,
        quantity: 1,
        retailerUrl: candidate.url,
        deliveryEstimate: candidate.deliveryEstimate,
        deliveryEstimated: candidate.deliveryEstimated,
      },
    ],
    subtotal,
    tax,
    shipping,
    total,
    currency: 'USD',
    approved: false,
    createdAt: now,
    priceSnapshotAt: now,
    negotiatedFromPrice: overridePrice !== undefined ? candidate.price : undefined,
  };
}

async function consumeSse(
  response: Response,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as AgentEvent);
      } catch {
        // ignore incomplete frame
      }
    }
  }
}

export async function fetchActiveMandate(): Promise<Mandate> {
  try {
    const res = await fetch('/api/mandate');
    if (res.ok) {
      const data = (await res.json()) as { active?: Mandate } | Mandate;
      const resolved = 'active' in data && data.active ? data.active : (data as Mandate);
      writeStorage(STORAGE_KEYS.mandate, resolved);
      return resolved;
    }
  } catch {
    // fallback to browser state when backend route is unavailable
  }
  return readStorage<Mandate>(STORAGE_KEYS.mandate, DEFAULT_MANDATE);
}

export async function saveMandateRequest(input: MandateUpsert): Promise<Mandate> {
  try {
    const res = await fetch('/api/mandate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const saved = (await res.json()) as Mandate;
      writeStorage(STORAGE_KEYS.mandate, saved);
      return saved;
    }
  } catch {
    // fallback to browser state when backend route is unavailable
  }

  const saved: Mandate = {
    ...input,
    id: input.id ?? 'mandate-default',
  };
  writeStorage(STORAGE_KEYS.mandate, saved);
  return saved;
}

export async function runAgentStream(
  params: { request: string; mandate: Mandate; sessionId: string; sessionSpentTotal: number },
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  try {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        request: params.request,
        mandateId: params.mandate.id,
        sessionId: params.sessionId,
      }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
      await consumeSse(res, onEvent);
      return;
    }
  } catch {
    // Fall back to the local mock stream when backend SSE routes are not mounted yet
  }

  const emit = (
    partial: Omit<AgentEvent, 'id' | 'timestamp' | 'sessionId'>,
    verdict?: PolicyDecision['verdict']
  ) => {
    const event: AgentEvent = {
      id: `evt-${Math.random().toString(36).slice(2, 10)}`,
      sessionId: params.sessionId,
      timestamp: new Date().toISOString(),
      ...partial,
    };
    pushMockAudit({ ...event, mandateId: params.mandate.id, verdict });
    onEvent(event);
  };

  const q = params.request.toLowerCase();
  const budgetMatch = params.request.match(/\$(\d+(?:\.\d{1,2})?)/);
  const intent: ParsedIntent = {
    query: params.request.trim(),
    maxBudget: budgetMatch ? Number(budgetMatch[1]) : undefined,
    category: q.includes('cable') ? 'accessories' : 'electronics',
    deliverBy: q.includes('friday')
      ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : undefined,
  };

  emit({
    type: 'intent_parsed',
    message: `Parsed constraints: query="${intent.query}"${intent.maxBudget ? `, budget<=$${intent.maxBudget}` : ''}.`,
    data: { intent },
  });

  await wait(180);
  emit({
    type: 'search_started',
    message: 'Searching product catalog and sanitizing untrusted product text...',
  });

  await wait(220);
  let selectedPool: Candidate[];
  if (q.includes('ignore') || q.includes('injection') || q.includes('shady')) {
    selectedPool = [MOCK_CANDIDATES[5], MOCK_CANDIDATES[0], MOCK_CANDIDATES[2]];
  } else if (q.includes('over') || q.includes('focal') || q.includes('500')) {
    selectedPool = [MOCK_CANDIDATES[4], MOCK_CANDIDATES[1], MOCK_CANDIDATES[0]];
  } else if (q.includes('cable') || q.includes('usb') || q.includes('50')) {
    selectedPool = [MOCK_CANDIDATES[3], MOCK_CANDIDATES[2], MOCK_CANDIDATES[0]];
  } else {
    selectedPool = [MOCK_CANDIDATES[0], MOCK_CANDIDATES[1], MOCK_CANDIDATES[2]];
  }

  emit({
    type: 'candidates_found',
    message: `Found ${selectedPool.length} candidates.`,
    data: { count: selectedPool.length },
  });

  await wait(180);
  emit({
    type: 'ranked',
    message: 'Ranked top 3 options with plain-English explanations.',
    data: { candidates: selectedPool },
  });

  await wait(160);
  const cartsByCandidateId: Record<string, Cart> = {};
  const storedCarts = readStorage<Record<string, Cart>>(STORAGE_KEYS.carts, {});
  for (const cand of selectedPool) {
    const cart = buildMockCart(cand, params.mandate.id, params.sessionId);
    cartsByCandidateId[cand.id] = cart;
    storedCarts[cart.id] = cart;
  }
  writeStorage(STORAGE_KEYS.carts, storedCarts);

  const primaryCart = cartsByCandidateId[selectedPool[0].id];
  emit({
    type: 'cart_ready',
    message: `Built cart ${primaryCart.id} ($${primaryCart.total.toFixed(2)} incl. est. tax).`,
    data: { cart: primaryCart, cartsByCandidateId },
  });

  await wait(160);
  const decision = evaluateCartForUi(params.mandate, primaryCart, params.sessionSpentTotal);
  emit(
    {
      type: 'policy_checked',
      message: `Policy Engine verdict: ${decision.verdict.toUpperCase()} (${decision.ruleIds.join(', ')}).`,
      data: { decision, cartId: primaryCart.id },
    },
    decision.verdict
  );

  await wait(100);
  if (decision.verdict === 'deny') {
    emit(
      {
        type: 'blocked',
        message: `Blocked by Mandate: ${decision.reasons.join(' ')}`,
        data: { decision, cartId: primaryCart.id },
      },
      'deny'
    );
  } else if (decision.verdict === 'needs_approval') {
    emit(
      {
        type: 'awaiting_approval',
        message: `Awaiting human approval ($${primaryCart.total.toFixed(2)} > $${params.mandate.autoApproveBelow.toFixed(2)} auto-approve cap).`,
        data: { decision, cartId: primaryCart.id },
      },
      'needs_approval'
    );
  } else {
    emit(
      {
        type: 'approved',
        message: `Auto-approved within Mandate ($${primaryCart.total.toFixed(2)} <= $${params.mandate.autoApproveBelow.toFixed(2)}).`,
        data: { decision, cartId: primaryCart.id },
      },
      'allow'
    );
  }
}

export async function startNegotiationStream(
  params: { candidate: Candidate; mandate: Mandate; sessionId: string; sessionSpentTotal: number },
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  try {
    const res = await fetch('/api/negotiate/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: params.candidate.id,
        mandateId: params.mandate.id,
        sessionId: params.sessionId,
      }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
      await consumeSse(res, onEvent);
      return;
    }
  } catch {
    // Fall back to the local mock stream when backend SSE routes are not mounted yet
  }

  const emit = (partial: Omit<AgentEvent, 'id' | 'timestamp' | 'sessionId'>) => {
    const event: AgentEvent = {
      id: `evt-${Math.random().toString(36).slice(2, 10)}`,
      sessionId: params.sessionId,
      timestamp: new Date().toISOString(),
      ...partial,
    };
    pushMockAudit({ ...event, mandateId: params.mandate.id });
    onEvent(event);
  };

  const base = params.candidate.price;
  const agreed = roundCents(Math.min(params.mandate.maxPerPurchase, base * 0.87));

  const turns: NegotiationTurn[] = [
    {
      round: 1,
      actor: 'buyer_agent',
      proposedPrice: roundCents(base * 0.8),
      message: `Can you accept $${roundCents(base * 0.8).toFixed(2)} for immediate PayPal checkout?`,
      accepted: false,
      timestamp: new Date().toISOString(),
    },
    {
      round: 2,
      actor: 'seller_agent',
      proposedPrice: roundCents(base * 0.93),
      message: `List is $${base.toFixed(2)}. Best instant-settlement counter is $${roundCents(base * 0.93).toFixed(2)}.`,
      accepted: false,
      timestamp: new Date().toISOString(),
    },
    {
      round: 3,
      actor: 'buyer_agent',
      proposedPrice: agreed,
      message: `Countering at $${agreed.toFixed(2)} inside our Mandate ceiling with zero hold.`,
      accepted: false,
      timestamp: new Date().toISOString(),
    },
    {
      round: 4,
      actor: 'seller_agent',
      proposedPrice: agreed,
      message: `Deal accepted at $${agreed.toFixed(2)}. Locking price for Policy Engine verification.`,
      accepted: true,
      timestamp: new Date().toISOString(),
    },
  ];

  for (const turn of turns) {
    await wait(280);
    emit({
      type: 'negotiation_turn',
      message: `[Round ${turn.round}/4] ${turn.actor === 'buyer_agent' ? 'Buyer Agent' : 'Seller Agent'}: $${turn.proposedPrice.toFixed(2)}`,
      data: { turn },
    });
  }

  const settledCart = buildMockCart(
    params.candidate,
    params.mandate.id,
    params.sessionId,
    agreed
  );
  const storedCarts = readStorage<Record<string, Cart>>(STORAGE_KEYS.carts, {});
  storedCarts[settledCart.id] = settledCart;
  writeStorage(STORAGE_KEYS.carts, storedCarts);

  const decision = evaluateCartForUi(
    params.mandate,
    settledCart,
    params.sessionSpentTotal
  );

  await wait(160);
  emit({
    type: 'negotiation_settled',
    message: `Negotiation settled at $${agreed.toFixed(2)} (down from $${base.toFixed(2)}).`,
    data: { cart: settledCart, decision },
  });
}

export async function approveCartRequest(
  cart: Cart,
  mandate: Mandate,
  sessionSpentTotal: number
): Promise<{ cart: Cart; decision: PolicyDecision }> {
  try {
    const res = await fetch('/api/cart/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId: cart.id }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        approved: true;
        cart?: Cart;
        decision?: PolicyDecision;
      };
      if (data.cart && data.decision) {
        return { cart: data.cart, decision: data.decision };
      }
    }
  } catch {
    // fallback to UI mock approval
  }

  const approvedCart: Cart = {
    ...cart,
    approved: true,
    approvedAt: new Date().toISOString(),
  };
  const storedCarts = readStorage<Record<string, Cart>>(STORAGE_KEYS.carts, {});
  storedCarts[approvedCart.id] = approvedCart;
  writeStorage(STORAGE_KEYS.carts, storedCarts);

  const decision = evaluateCartForUi(mandate, approvedCart, sessionSpentTotal);
  pushMockAudit({
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    sessionId: cart.sessionId,
    mandateId: mandate.id,
    verdict: decision.verdict,
    type: 'approved',
    timestamp: new Date().toISOString(),
    message: `Human approved cart ${cart.id} ($${cart.total.toFixed(2)}).`,
  });

  return { cart: approvedCart, decision };
}

export async function createOrderRequest(cart: Cart): Promise<string> {
  try {
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId: cart.id }),
    });
    if (res.ok) {
      const data = (await res.json()) as { paypalOrderId: string };
      return data.paypalOrderId;
    }
    if (res.status !== 404) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? 'Order creation blocked by Policy Engine');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Policy Engine')) {
      throw err;
    }
  }

  const paypalOrderId = `PAYPAL-SBX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const order: PaymentOrder = {
    id: `ord-${Math.random().toString(36).slice(2, 10)}`,
    paypalOrderId,
    cartId: cart.id,
    mandateId: cart.mandateId,
    sessionId: cart.sessionId,
    status: 'CREATED',
    amount: cart.total,
    breakdown: {
      itemTotal: cart.subtotal,
      taxTotal: cart.tax,
      shipping: cart.shipping,
      total: cart.total,
    },
    currency: 'USD',
    items: cart.items,
    sandboxMode: true,
    createdAt: new Date().toISOString(),
  };

  const orders = readStorage<Record<string, PaymentOrder>>(STORAGE_KEYS.orders, {});
  orders[paypalOrderId] = order;
  writeStorage(STORAGE_KEYS.orders, orders);

  pushMockAudit({
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    sessionId: cart.sessionId,
    mandateId: cart.mandateId,
    verdict: 'allow',
    type: 'order_created',
    timestamp: new Date().toISOString(),
    message: `Created PayPal Sandbox order ${paypalOrderId} for $${cart.total.toFixed(2)}.`,
  });

  return paypalOrderId;
}

export async function captureOrderRequest(paypalOrderId: string): Promise<PaymentOrder> {
  try {
    const res = await fetch('/api/orders/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId }),
    });
    if (res.ok) {
      const captured = (await res.json()) as PaymentOrder;
      const orders = readStorage<Record<string, PaymentOrder>>(STORAGE_KEYS.orders, {});
      orders[captured.paypalOrderId] = captured;
      writeStorage(STORAGE_KEYS.orders, orders);
      return captured;
    }
    if (res.status !== 404) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? 'Order capture blocked by Policy Engine');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Policy Engine')) {
      throw err;
    }
  }

  const orders = readStorage<Record<string, PaymentOrder>>(STORAGE_KEYS.orders, {});
  const existing = orders[paypalOrderId];
  if (!existing) {
    throw new Error(`Order ${paypalOrderId} not found`);
  }

  const captured: PaymentOrder = {
    ...existing,
    status: 'COMPLETED',
    captureId: `CAP-SBX-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    capturedAt: new Date().toISOString(),
  };
  orders[paypalOrderId] = captured;
  writeStorage(STORAGE_KEYS.orders, orders);

  const prevSpend = readStorage<number>(STORAGE_KEYS.sessionSpend, 0);
  writeStorage(STORAGE_KEYS.sessionSpend, roundCents(prevSpend + captured.amount));

  pushMockAudit({
    id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    sessionId: captured.sessionId,
    mandateId: captured.mandateId,
    verdict: 'allow',
    type: 'payment_captured',
    timestamp: new Date().toISOString(),
    message: `PayPal Sandbox payment captured (${captured.captureId}) for $${captured.amount.toFixed(2)}.`,
  });

  return captured;
}

export async function fetchOrderReceipt(id: string): Promise<PaymentOrder | null> {
  try {
    const res = await fetch(`/api/orders/capture?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      return (await res.json()) as PaymentOrder;
    }
  } catch {
    // fallback to browser session storage
  }
  const orders = readStorage<Record<string, PaymentOrder>>(STORAGE_KEYS.orders, {});
  return orders[id] ?? null;
}

export async function fetchAuditEvents(sessionId?: string): Promise<AuditEvent[]> {
  try {
    const qs = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : '';
    const res = await fetch(`/api/audit${qs}`);
    if (res.ok) {
      return (await res.json()) as AuditEvent[];
    }
  } catch {
    // fallback to browser session storage
  }
  const all = readStorage<AuditEvent[]>(STORAGE_KEYS.audit, []);
  return sessionId ? all.filter((e) => e.sessionId === sessionId) : all;
}

