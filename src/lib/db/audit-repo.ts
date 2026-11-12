import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { AgentEvent, AuditEvent } from "../../contracts";
import { AgentEventSchema } from "../../contracts";
import type { Backend } from "./client";
import { auditEvents } from "./schema";

export interface AuditRepo {
  /** Every AgentEvent is written as an AuditEvent (FR-A2-7). */
  append(event: AgentEvent): Promise<AuditEvent>;
  listBySession(sessionId: string): Promise<AuditEvent[]>;
}

const SECRET_KEY =
  /secret|token|password|api[_-]?key|authorization|credential/i;
/** FR-A2-30: never let secrets reach the log. */
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        SECRET_KEY.test(k) ? "[redacted]" : redact(v),
      ]),
    );
  }
  return value;
}

export function createAuditRepo(b: Backend): AuditRepo {
  const toAudit = (e: AgentEvent): AuditEvent => {
    const v = AgentEventSchema.parse(e);
    return {
      ...v,
      ...(v.data ? { data: redact(v.data) as Record<string, unknown> } : {}),
      id: randomUUID(),
    };
  };
  if (b.kind === "memory") {
    return {
      async append(e) {
        const a = toAudit(e);
        b.store.events.push(a);
        return a;
      },
      async listBySession(sid) {
        return b.store.events.filter((x) => x.sessionId === sid);
      },
    };
  }
  return {
    async append(e) {
      const a = toAudit(e);
      await b.db
        .insert(auditEvents)
        .values({
          id: a.id,
          sessionId: a.sessionId,
          type: a.type,
          at: new Date(a.at),
          data: a,
        });
      return a;
    },
    async listBySession(sid) {
      const rows = await b.db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.sessionId, sid))
        .orderBy(asc(auditEvents.at), asc(auditEvents.seq));
      return rows.map((r) => r.data);
    },
  };
}
