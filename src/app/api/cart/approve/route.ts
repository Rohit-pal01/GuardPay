import { ApproveCartRequestSchema } from '../../../../contracts';
import { getExecutor } from '../../../../lib/policy';

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Body must be valid JSON.' }, { status: 400 }); }
  const parsed = ApproveCartRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'cartId is required.', issues: parsed.error.issues }, { status: 400 });
  const r = await getExecutor().recordApproval(parsed.data.cartId);
  return r.approved ? Response.json({ approved: true }) : Response.json({ error: r.reason }, { status: 404 });
}
