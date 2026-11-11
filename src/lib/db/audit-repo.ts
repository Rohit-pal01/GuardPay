import { AuditEvent, AuditEventSchema } from "@/contracts/events.js";

const auditLogs: AuditEvent[] = [];

export function appendAuditEvent(event: AuditEvent): AuditEvent {
  const parsed = AuditEventSchema.parse(event);
  auditLogs.push(parsed);
  return parsed;
}

export function getAuditEvents(sessionId?: string): AuditEvent[] {
  if (!sessionId) return [...auditLogs];
  return auditLogs.filter((e) => e.sessionId === sessionId);
}
