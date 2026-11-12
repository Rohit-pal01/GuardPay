import { boolean, jsonb, numeric, pgTable, text } from 'drizzle-orm/pg-core';

export const mandates = pgTable('mandates', {
  id: text('id').primaryKey(),
  maxPerPurchase: numeric('max_per_purchase').notNull(),
  maxSessionTotal: numeric('max_session_total').notNull(),
  allowedCategories: jsonb('allowed_categories').$type<string[]>().notNull(),
  blockedMerchants: jsonb('blocked_merchants').$type<string[]>().notNull(),
  deliverBy: text('deliver_by'),
  autoApproveBelow: numeric('auto_approve_below').notNull(),
  currency: text('currency').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const carts = pgTable('carts', {
  id: text('id').primaryKey(),
  mandateId: text('mandate_id').notNull(),
  sessionId: text('session_id').notNull(),
  items: jsonb('items').$type<unknown[]>().notNull(),
  subtotal: numeric('subtotal').notNull(),
  tax: numeric('tax').notNull(),
  shipping: numeric('shipping').notNull(),
  total: numeric('total').notNull(),
  currency: text('currency').notNull(),
  approved: boolean('approved').notNull(),
  approvedAt: text('approved_at'),
  status: text('status'),
  createdAt: text('created_at').notNull(),
  priceSnapshotAt: text('price_snapshot_at').notNull(),
  negotiatedFromPrice: numeric('negotiated_from_price'),
});

export const paymentOrders = pgTable('payment_orders', {
  id: text('id').primaryKey(),
  paypalOrderId: text('paypal_order_id').notNull().unique(),
  captureId: text('capture_id'),
  cartId: text('cart_id').notNull(),
  mandateId: text('mandate_id').notNull(),
  sessionId: text('session_id').notNull(),
  status: text('status').notNull(),
  amount: numeric('amount').notNull(),
  breakdown: jsonb('breakdown').$type<Record<string, number>>().notNull(),
  currency: text('currency').notNull(),
  items: jsonb('items').$type<unknown[]>().notNull(),
  sandboxMode: boolean('sandbox_mode').notNull(),
  createdAt: text('created_at').notNull(),
  capturedAt: text('captured_at'),
  failureReason: text('failure_reason'),
});

export const auditEvents = pgTable('audit_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  type: text('type').notNull(),
  timestamp: text('timestamp').notNull(),
  message: text('message').notNull(),
  data: jsonb('data').$type<Record<string, unknown>>(),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  mandateId: text('mandate_id'),
  verdict: text('verdict'),
});
