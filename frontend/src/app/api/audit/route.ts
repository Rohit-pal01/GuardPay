import { type NextRequest, NextResponse } from 'next/server';
import { AuditQuerySchema } from '@/contracts/api';
import { getAuditEvents } from '@/lib/db/audit-repo';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSessionId = searchParams.get('sessionId') || undefined;

    const parsed = AuditQuerySchema.safeParse({ sessionId: rawSessionId });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const events = await getAuditEvents(parsed.data.sessionId);
    return NextResponse.json(events);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
