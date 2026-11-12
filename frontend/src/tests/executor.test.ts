import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cart } from '@/contracts/cart';
import type { Mandate } from '@/contracts/mandate';
import { getAuditEvents, resetAuditLogs } from '@/lib/db/audit-repo';
import { getCart, resetCarts, saveCart, updateCartApproval } from '@/lib/db/cart-repo';
import { resetMandates, saveMandate } from '@/lib/db/mandate-repo';
import { resetOrders } from '@/lib/db/order-repo';
import { executeCaptureOrder, executeCreateOrder } from '@/lib/policy/executor';

// These tests run on the PayPal mock. They never call the real PayPal.
vi.stubEnv('USE_MOCKS', 'true');

describe('Server-Side Safety Gate & Executor (Member A2)', () => {
  const mandate: Mandate = {
    id: 'mandate-executor-test',
    maxPerPurchase: 300,
    maxSessionTotal: 1000,
    allowedCategories: ['electronics'],
    blockedMerchants: ['ShadyMerchant'],
    deliverBy: '2026-12-01',
    autoApproveBelow: 50, // carts above $50 require human approval
    currency: 'USD',
    expiresAt: '2026-12-31T23:59:59.000Z',
  };

  const sampleCart: Cart = {
    id: 'cart-executor-101',
    mandateId: mandate.id,
    sessionId: 'session-sec-01',
    items: [
      {
        candidateId: 'cand-headphones',
        title: 'Bose Headphones',
        merchant: 'Target',
        category: 'electronics',
        unitPrice: 150,
        quantity: 1,
        retailerUrl: 'https://target.com/p/bose',
        deliveryEstimate: '2026-11-20',
        deliveryEstimated: false,
      },
    ],
    subtotal: 150,
    tax: 12,
    shipping: 0,
    total: 162,
    currency: 'USD',
    approved: false,
    createdAt: new Date().toISOString(),
    priceSnapshotAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await resetCarts();
    await resetMandates();
    await resetOrders();
    await resetAuditLogs();
    await saveMandate(mandate);
  });

  it('Requirement 3: NEVER trusts cart.approved from caller; only trusts approval stored in DB by /api/cart/approve', async () => {
    // Step 1: Save the draft cart in the database (approved: false)
    await saveCart(sampleCart);

    // Step 2: An untrusted client or agent tries to bypass the gate by claiming approved: true
    const untrustedCartFromClient: Cart = {
      ...sampleCart,
      approved: true, // Spoofed approval flag!
      approvedAt: new Date().toISOString(),
    };

    // Step 3: Executor must reject the untrusted cart because the DB record is still unapproved!
    await expect(
      executeCreateOrder({
        cartId: sampleCart.id,
        untrustedCart: untrustedCartFromClient,
      })
    ).rejects.toThrow(/has not been approved via \/api\/cart\/approve/);

    // Verify database record remained untampered
    const dbCartBefore = await getCart(sampleCart.id);
    expect(dbCartBefore?.approved).toBe(false);

    // Step 4: Now simulate legitimate human approval saved by /api/cart/approve
    const approvedDbCart = await updateCartApproval(sampleCart.id, true);
    expect(approvedDbCart?.approved).toBe(true);

    // Step 5: Executor now allows order creation
    const result = await executeCreateOrder({ cartId: sampleCart.id });
    expect(result.paypalOrderId).toBeDefined();
    expect(result.order.status).toBe('CREATED');
    expect(result.order.amount).toBe(162);

    // Step 6: Verify audit event log records order_created
    const events = await getAuditEvents(sampleCart.sessionId);
    expect(events.some((e) => e.type === 'order_created')).toBe(true);
  });

  it('allows zero-click order creation for carts <= autoApproveBelow without manual approval', async () => {
    const cheapCart: Cart = {
      ...sampleCart,
      id: 'cart-cheap-001',
      items: [
        {
          ...sampleCart.items[0],
          unitPrice: 30,
        },
      ],
      subtotal: 30,
      tax: 2.4,
      shipping: 0,
      total: 32.4,
      approved: false,
    };

    await saveCart(cheapCart);

    const result = await executeCreateOrder({ cartId: cheapCart.id });
    expect(result.paypalOrderId).toBeDefined();
    expect(result.decision.verdict).toBe('allow');
  });

  it('FR-A2-20: executeCaptureOrder re-checks price drift and captures payment', async () => {
    // Approve and create order
    await saveCart(sampleCart);
    await updateCartApproval(sampleCart.id, true);
    const created = await executeCreateOrder({ cartId: sampleCart.id });

    // Capture payment through executor
    const captured = await executeCaptureOrder({ paypalOrderId: created.paypalOrderId });
    expect(captured.status).toBe('COMPLETED');
    expect(captured.captureId).toBeDefined();

    // Verify payment_captured audit event
    const events = await getAuditEvents(sampleCart.sessionId);
    expect(events.some((e) => e.type === 'payment_captured')).toBe(true);
  });

  it('FR-A2-20: blocks capture if cart price drifted after order creation', async () => {
    await saveCart(sampleCart);
    await updateCartApproval(sampleCart.id, true);
    const created = await executeCreateOrder({ cartId: sampleCart.id });

    // Simulate price drift on the merchant side
    await saveCart({
      ...sampleCart,
      total: 199, // price jumped from 162 to 199
    });

    await expect(
      executeCaptureOrder({ paypalOrderId: created.paypalOrderId })
    ).rejects.toThrow(/blocked by Policy Engine/);
  });
});
