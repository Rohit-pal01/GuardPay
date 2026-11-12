import { type NextRequest, NextResponse } from 'next/server';
import { OrderCaptureRequestSchema } from '@/contracts/api';
import { getOrder } from '@/lib/db/order-repo';
import { executeCaptureOrder } from '@/lib/policy/executor';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Order id is required' }, { status: 400 });
  }

  const order = getOrder(id);
  if (!order) {
    return NextResponse.json({ error: `Order ${id} not found` }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = OrderCaptureRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const capturedOrder = await executeCaptureOrder({
      paypalOrderId: parsed.data.paypalOrderId,
    });

    return NextResponse.json(capturedOrder);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown order capture error';
    const status = message.includes('blocked') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
