import fs from 'node:fs';
import path from 'node:path';
import { type AuditEvent, AuditEventSchema } from '@/contracts/events';

const auditLogs: AuditEvent[] = [];
const AUDIT_FILE = path.join(process.cwd(), '.audit-log.json');

// Restore persisted events on startup if present
try {
  if (fs.existsSync(AUDIT_FILE)) {
    const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        const validated = AuditEventSchema.safeParse(item);
        if (validated.success) {
          auditLogs.push(validated.data);
        }
      }
    }
  }
} catch {
  // Fall back silently to memory store
}

function persistLogs(): void {
  try {
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLogs, null, 2), 'utf-8');
  } catch {
    // Ignore file write errors in restricted environments
  }
}

/**
 * Appends an AgentEvent as an AuditEvent to the persistent log.
 * FR-A2-7 & NFR-3 / NFR-4.
 */
export function appendAuditEvent(event: AuditEvent): AuditEvent {
  const parsed = AuditEventSchema.parse(event);
  auditLogs.push(parsed);
  persistLogs();
  return parsed;
}

/**
 * Retrieves audit events, optionally filtered by session ID.
 */
export function getAuditEvents(sessionId?: string): AuditEvent[] {
  if (!sessionId) return [...auditLogs];
  return auditLogs.filter((e) => e.sessionId === sessionId);
}

/**
 * Calculates total confirmed spend for a session from captured orders.
 */
export function getSessionSpent(sessionId?: string): number {
  if (!sessionId) return 0;
  return auditLogs
    .filter((e) => e.sessionId === sessionId && e.type === 'payment_captured')
    .reduce((acc, curr) => {
      const data = curr.data as { amount?: number; total?: number } | undefined;
      const amt = data?.amount ?? data?.total ?? 0;
      return acc + amt;
    }, 0);
}

export function resetAuditLogs(): void {
  auditLogs.length = 0;
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      fs.unlinkSync(AUDIT_FILE);
    }
  } catch {
    // ignore
  }
}
