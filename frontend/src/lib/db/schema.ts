/**
 * Drizzle ORM / Database schema definitions for Mandate, Carts, Orders, and Audit Events.
 * (FR-A2-4: Neon Postgres schema with fallback to memory store).
 */

export interface DbMandateRecord {
  id: string;
  maxPerPurchase: number;
  maxSessionTotal: number;
  allowedCategories: string[];
  blockedMerchants: string[];
  deliverBy?: string;
  autoApproveBelow: number;
  currency: 'USD';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbCartRecord {
  id: string;
  mandateId: string;
  sessionId: string;
  items: unknown[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: 'USD';
  approved: boolean;
  approvedAt?: string;
  createdAt: string;
  priceSnapshotAt: string;
  negotiatedFromPrice?: number;
}

export interface DbPaymentOrderRecord {
  id: string;
  paypalOrderId: string;
  captureId?: string;
  cartId: string;
  mandateId: string;
  sessionId: string;
  status: 'CREATED' | 'APPROVED' | 'COMPLETED' | 'FAILED';
  amount: number;
  breakdown: Record<string, number>;
  currency: 'USD';
  items: unknown[];
  sandboxMode: boolean;
  createdAt: string;
  capturedAt?: string;
}

export interface DbAuditEventRecord {
  id: string;
  sessionId: string;
  type: string;
  timestamp: string;
  message: string;
  data?: Record<string, unknown>;
  mandateId?: string;
  verdict?: 'allow' | 'needs_approval' | 'deny';
}
