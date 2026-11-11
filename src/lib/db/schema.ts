import { integer, jsonb, pgTable, serial, text, timestamp, index } from 'drizzle-orm/pg-core';
import type { AuditEvent, Cart, Mandate, PaymentOrder } from '../../contracts';

export const mandates = pgTable('mandates', {
  id: text('id').primaryKey(),
  data: jsonb('data').$type<Mandate>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const carts = pgTable('carts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  data: jsonb('data').$type<Cart>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cartApprovals = pgTable('cart_approvals', {
  cartId: text('cart_id').primaryKey(),
  amountCents: integer('amount_cents').notNull(), // approval only counts for this exact amount
  approvedAt: timestamp('approved_at').defaultNow().notNull(),
});

export const paymentOrders = pgTable('payment_orders', {
  paypalOrderId: text('paypal_order_id').primaryKey(),
  cartId: text('cart_id').notNull(),
  sessionId: text('session_id').notNull(),
  status: text('status').notNull(),
  data: jsonb('data').$type<PaymentOrder>().notNull(),
});

export const auditEvents = pgTable('audit_events', {
  seq: serial('seq').primaryKey(),
  id: text('id').notNull(),
  sessionId: text('session_id').notNull(),
  type: text('type').notNull(),
  at: timestamp('at').notNull(),
  data: jsonb('data').$type<AuditEvent>().notNull(),
}, (t) => ({ bySession: index('audit_events_session_idx').on(t.sessionId) }));
