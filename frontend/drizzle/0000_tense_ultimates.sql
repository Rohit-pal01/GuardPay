CREATE TABLE "audit_events" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"type" text NOT NULL,
	"timestamp" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"payload" jsonb,
	"mandate_id" text,
	"verdict" text
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" text PRIMARY KEY NOT NULL,
	"mandate_id" text NOT NULL,
	"session_id" text NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal" numeric NOT NULL,
	"tax" numeric NOT NULL,
	"shipping" numeric NOT NULL,
	"total" numeric NOT NULL,
	"currency" text NOT NULL,
	"approved" boolean NOT NULL,
	"approved_at" text,
	"status" text,
	"created_at" text NOT NULL,
	"price_snapshot_at" text NOT NULL,
	"negotiated_from_price" numeric
);
--> statement-breakpoint
CREATE TABLE "mandates" (
	"id" text PRIMARY KEY NOT NULL,
	"max_per_purchase" numeric NOT NULL,
	"max_session_total" numeric NOT NULL,
	"allowed_categories" jsonb NOT NULL,
	"blocked_merchants" jsonb NOT NULL,
	"deliver_by" text,
	"auto_approve_below" numeric NOT NULL,
	"currency" text NOT NULL,
	"expires_at" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"paypal_order_id" text NOT NULL,
	"capture_id" text,
	"cart_id" text NOT NULL,
	"mandate_id" text NOT NULL,
	"session_id" text NOT NULL,
	"status" text NOT NULL,
	"amount" numeric NOT NULL,
	"breakdown" jsonb NOT NULL,
	"currency" text NOT NULL,
	"items" jsonb NOT NULL,
	"sandbox_mode" boolean NOT NULL,
	"created_at" text NOT NULL,
	"captured_at" text,
	"failure_reason" text,
	CONSTRAINT "payment_orders_paypal_order_id_unique" UNIQUE("paypal_order_id")
);
