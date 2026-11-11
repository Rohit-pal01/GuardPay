import { AuditQuerySchema } from '../../../contracts';
import { getRepos } from '../../../lib/db';

export async function GET(req: Request): Promise<Response> {
  const parsed = AuditQuerySchema.safeParse({ sessionId: new URL(req.url).searchParams.get('sessionId') ?? undefined });
  if (!parsed.success) return Response.json({ error: 'sessionId query parameter is required.' }, { status: 400 });
  return Response.json(await getRepos().audit.listBySession(parsed.data.sessionId));
}
