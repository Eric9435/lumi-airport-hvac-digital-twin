import type { SecurityAuditRecord } from "@/types/security";

const globalAuditStore = globalThis as typeof globalThis & {
  __lumiSecurityAudit?: SecurityAuditRecord[];
};

if (!globalAuditStore.__lumiSecurityAudit) {
  globalAuditStore.__lumiSecurityAudit = [];
}

export function appendSecurityAudit(
  record: SecurityAuditRecord,
): SecurityAuditRecord {
  globalAuditStore.__lumiSecurityAudit?.unshift(record);

  globalAuditStore.__lumiSecurityAudit =
    globalAuditStore.__lumiSecurityAudit?.slice(0, 1000);

  return record;
}

export function listSecurityAudit(): SecurityAuditRecord[] {
  return [...(globalAuditStore.__lumiSecurityAudit ?? [])];
}
