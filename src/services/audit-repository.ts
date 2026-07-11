import type { AuditRecord } from "@/types/operations";

const globalAuditStore = globalThis as typeof globalThis & {
  __lumiAuditRecords?: AuditRecord[];
};

if (!globalAuditStore.__lumiAuditRecords) {
  globalAuditStore.__lumiAuditRecords = [];
}

export function listAuditRecords(): AuditRecord[] {
  return [...(globalAuditStore.__lumiAuditRecords ?? [])];
}

export function appendAuditRecord(record: AuditRecord): AuditRecord {
  globalAuditStore.__lumiAuditRecords?.unshift(record);

  globalAuditStore.__lumiAuditRecords =
    globalAuditStore.__lumiAuditRecords?.slice(0, 500);

  return record;
}
