import { demoId, iso, sampleHash } from "./ids";
import type { AuditEntry } from "./world";

export const SAMPLE_OPERATOR = "Sample operator";

export interface AuditEvent {
  actor: string;
  role: "Operator" | "System";
  resource: string;
  action: string;
  at: number;
}

export const auditHash = (entry: Omit<AuditEntry, "afterHash">): string =>
  sampleHash(
    `audit:${JSON.stringify([entry.id, entry.actor, entry.role, entry.resource, entry.action, entry.beforeHash, entry.at])}`,
  );

export const appendAudit = (entries: AuditEntry[], event: AuditEvent): AuditEntry => {
  const content = {
    id: demoId("audit", entries.length + 1),
    actor: event.actor,
    role: event.role,
    resource: event.resource,
    action: event.action,
    beforeHash: entries.at(-1)?.afterHash ?? null,
    at: iso(event.at),
  };
  const entry: AuditEntry = { ...content, afterHash: auditHash(content) };
  entries.push(entry);
  return entry;
};

export const chainAudit = (events: readonly AuditEvent[]): AuditEntry[] => {
  const entries: AuditEntry[] = [];
  for (const event of [...events].sort((a, b) => a.at - b.at)) appendAudit(entries, event);
  return entries;
};

export const operatorEvent = (resource: string, action: string, at: number): AuditEvent => ({
  actor: SAMPLE_OPERATOR,
  role: "Operator",
  resource,
  action,
  at,
});

export const systemEvent = (
  job: string,
  resource: string,
  action: string,
  at: number,
): AuditEvent => ({
  actor: `System · ${job}`,
  role: "System",
  resource,
  action,
  at,
});
