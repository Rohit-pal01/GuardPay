import fs from 'node:fs';
import path from 'node:path';
import { eq, sql } from 'drizzle-orm';
import { type AuditEvent, AuditEventSchema } from '@/contracts/events';
import { db, isDatabaseEnabled } from './client';
import { auditEvents } from './schema';

const auditLogs: AuditEvent[] = [];
const auditFile = path.join(process.cwd(), '.audit-log.json');

if (!isDatabaseEnabled) {
  try {
    const parsed = JSON.parse(fs.readFileSync(auditFile, 'utf-8'));
    if (Array.isArray(parsed)) auditLogs.push(...parsed.map((item) => AuditEventSchema.safeParse(item)).filter((result) => result.success).map((result) => result.data));
  } catch { /* no local audit log yet */ }
}

function persistLocalLogs(): void {
  if (!isDatabaseEnabled) {
    try { fs.writeFileSync(auditFile, JSON.stringify(auditLogs, null, 2), 'utf-8'); } catch { /* non-persistent local environment */ }
  }
}

export async function appendAuditEvent(event: AuditEvent): Promise<AuditEvent> {
  const parsed = AuditEventSchema.parse(event);
  if (!isDatabaseEnabled) { auditLogs.push(parsed); persistLocalLogs(); return parsed; }
  await db!.insert(auditEvents).values({
    id: parsed.id, sessionId: parsed.sessionId, type: parsed.type, timestamp: parsed.timestamp,
    message: parsed.message, data: parsed.data, payload: parsed.payload,
    mandateId: parsed.mandateId, verdict: parsed.verdict,
  }).onConflictDoNothing();
  return parsed;
}

export async function getAuditEvents(sessionId?: string): Promise<AuditEvent[]> {
  if (!isDatabaseEnabled) return sessionId ? auditLogs.filter((event) => event.sessionId === sessionId) : [...auditLogs];
  const records = sessionId
    ? await db!.select().from(auditEvents).where(eq(auditEvents.sessionId, sessionId))
    : await db!.select().from(auditEvents);
  return records.map((record) => AuditEventSchema.parse(record));
}

export async function getSessionSpent(sessionId?: string): Promise<number> {
  if (!sessionId) return 0;
  if (!isDatabaseEnabled) return auditLogs.filter((event) => event.sessionId === sessionId && event.type === 'payment_captured').reduce((total, event) => total + Number((event.data as { amount?: number; total?: number } | undefined)?.amount ?? (event.data as { total?: number } | undefined)?.total ?? 0), 0);
  const [result] = await db!.select({ total: sql<string>`coalesce(sum((data->>'amount')::numeric), 0)` }).from(auditEvents).where(sql`${auditEvents.sessionId} = ${sessionId} and ${auditEvents.type} = 'payment_captured'`);
  return Number(result?.total ?? 0);
}

export async function resetAuditLogs(): Promise<void> {
  if (!isDatabaseEnabled) {
    auditLogs.length = 0;
    try { fs.unlinkSync(auditFile); } catch { /* absent file */ }
  }
}
