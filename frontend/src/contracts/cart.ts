import { z } from 'zod';

export const CartItemSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>;
      const unitPrice = v.unitPrice ?? v.price ?? 0;
      const retailerUrl = v.retailerUrl || v.url || 'https://guardpay.local/item';
      const deliveryEstimated = v.deliveryEstimated ?? false;
      return {
        ...v,
        unitPrice,
        price: unitPrice,
        retailerUrl,
        deliveryEstimated,
      };
    }
    return val;
  },
  z.object({
    candidateId: z.string().min(1),
    title: z.string().min(1),
    merchant: z.string().default('Unknown'),
    category: z.string().default('General'),
    unitPrice: z.number().nonnegative(),
    price: z.number().nonnegative().optional(),
    quantity: z.number().int().positive().default(1),
    retailerUrl: z.string().default('https://guardpay.local/item'),
    deliveryEstimate: z.string().optional(),
    deliveryEstimated: z.boolean().default(false),
    shippingCost: z.number().nonnegative().optional(),
  }),
);

export type CartItem = z.infer<typeof CartItemSchema>;

export const CartSchema = z.preprocess(
  (val: unknown) => {
    if (val && typeof val === 'object') {
      const v = val as Record<string, unknown>;
      const shipping = v.shipping ?? v.shippingTotal ?? 0;
      const tax = v.tax ?? v.taxTotal ?? 0;
      const approved = v.approved ?? (v.status === 'approved');
      const sessionId = v.sessionId || 'session-default';
      const priceSnapshotAt = v.priceSnapshotAt || v.createdAt || new Date().toISOString();
      return {
        ...v,
        shipping,
        shippingTotal: shipping,
        tax,
        taxTotal: tax,
        approved,
        sessionId,
        priceSnapshotAt,
      };
    }
    return val;
  },
  z.object({
    id: z.string().min(1),
    mandateId: z.string().min(1),
    sessionId: z.string().default('session-default'),
    items: z.array(CartItemSchema).min(1),
    subtotal: z.number().nonnegative(),
    tax: z.number().nonnegative().default(0),
    taxTotal: z.number().nonnegative().optional(),
    shipping: z.number().nonnegative().default(0),
    shippingTotal: z.number().nonnegative().optional(),
    total: z.number().nonnegative(),
    currency: z.literal('USD').default('USD'),
    approved: z.boolean().default(false),
    status: z.enum(['draft', 'approved', 'rejected', 'negotiated']).optional(),
    approvedAt: z.string().optional(),
    createdAt: z.string().default(() => new Date().toISOString()),
    priceSnapshotAt: z.string().default(() => new Date().toISOString()),
    negotiatedFromPrice: z.number().nonnegative().optional(),
  }),
);

export type Cart = z.infer<typeof CartSchema>;

