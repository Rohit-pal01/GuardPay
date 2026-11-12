import { type NextRequest, NextResponse } from 'next/server';
import { OrderCreateRequestSchema, OrderCreateResponseSchema } from '@/contracts/api';
import { executeCreateOrder } from '@/lib/policy/executor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = OrderCreateRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await executeCreateOrder({ cartId: parsed.data.cartId });
    const response = OrderCreateResponseSchema.parse({
      paypalOrderId: result.paypalOrderId,
    });

    return NextResponse.json({ ...response, decision: result.decision });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown order creation error';
    const status = message.includes('Denied') || message.includes('Approval Required') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
