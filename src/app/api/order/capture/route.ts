// Owner: A1. Stub from A2: shows the ONLY allowed wiring (FR-A2-23). A1 may extend, never bypass the executor.
import { z } from 'zod';
import { getExecutor } from '../../../../lib/policy';

export async function POST(req: Request): Promise<Response> {
  const p = z.object({ cartId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return Response.json({ error: 'cartId is required.' }, { status: 400 });
  return Response.json(await getExecutor().capturePaymentOrder(p.data.cartId));
}
