import { randomUUID } from "node:crypto";

import { appendSecurityAudit } from "@/services/security-audit.service";

import type { SecurityAuditRecord, SecuritySession } from "@/types/security";

interface AuditInput {
  session?: SecuritySession | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  result: "success" | "failed" | "rejected";
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}

export function recordSecurityAudit(input: AuditInput): SecurityAuditRecord {
  return appendSecurityAudit({
    auditId: randomUUID(),
    timestamp: new Date().toISOString(),
    actorUserId: input.session?.userId ?? null,
    actorEmail: input.session?.email ?? null,
    actorRole: input.session?.role ?? null,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId ?? null,
    result: input.result,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
    details: input.details ?? {},
  });
}
