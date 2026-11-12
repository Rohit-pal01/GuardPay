import { type NextRequest, NextResponse } from 'next/server';
import { MandatePostRequestSchema } from '@/contracts/api';
import { getActiveMandate, getMandate, saveMandate } from '@/lib/db/mandate-repo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const mandate = await getMandate(id);
    if (!mandate) {
      return NextResponse.json({ error: `Mandate ${id} not found` }, { status: 404 });
    }
    return NextResponse.json(mandate);
  }

  const active = await getActiveMandate();
  return NextResponse.json(active);
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = MandatePostRequestSchema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid mandate payload', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const saved = await saveMandate(parsed.data);
    return NextResponse.json(saved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
