import { randomUUID } from 'node:crypto';
import { CreateMandateRequestSchema } from '../../../contracts';
import { getRepos } from '../../../lib/db';

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try { body = await req.json(); } catch { return Response.json({ error: 'Body must be valid JSON.' }, { status: 400 }); }
  const parsed = CreateMandateRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Invalid Mandate.', issues: parsed.error.issues }, { status: 400 });
  const mandate = await getRepos().mandates.create({ ...parsed.data, id: parsed.data.id ?? randomUUID() });
  return Response.json(mandate, { status: 201 });
}
