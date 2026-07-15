import type { NexusApprovalRecord } from "@/nexus/contracts";
import {
  NexusApprovalConflictError,
  NexusApprovalNotFoundError,
} from "@/nexus/approvals/nexus-approval-errors";
import type {
  NexusApprovalQuery,
  NexusApprovalRepository,
} from "@/nexus/approvals/nexus-approval-repository";

function matchesQuery(
  record: NexusApprovalRecord,
  query: NexusApprovalQuery,
): boolean {
  return (
    (query.commandId === undefined || record.commandId === query.commandId) &&
    (query.targetTwin === undefined ||
      record.targetTwin === query.targetTwin) &&
    (query.targetAssetId === undefined ||
      record.targetAssetId === query.targetAssetId) &&
    (query.requestedBy === undefined ||
      record.requestedBy === query.requestedBy) &&
    (query.status === undefined || record.status === query.status)
  );
}

export class InMemoryNexusApprovalRepository implements NexusApprovalRepository {
  private readonly records = new Map<string, NexusApprovalRecord>();

  async create(record: NexusApprovalRecord): Promise<NexusApprovalRecord> {
    if (this.records.has(record.approvalId)) {
      throw new NexusApprovalConflictError(
        `Approval ${record.approvalId} already exists.`,
      );
    }

    const storedRecord = structuredClone(record);

    this.records.set(storedRecord.approvalId, storedRecord);

    return structuredClone(storedRecord);
  }

  async update(
    record: NexusApprovalRecord,
    expectedVersion: number,
  ): Promise<NexusApprovalRecord> {
    const existingRecord = this.records.get(record.approvalId);

    if (!existingRecord) {
      throw new NexusApprovalNotFoundError(
        `Approval ${record.approvalId} was not found.`,
      );
    }

    if (existingRecord.version !== expectedVersion) {
      throw new NexusApprovalConflictError(
        `Approval ${record.approvalId} was modified by another operation.`,
      );
    }

    if (record.version !== expectedVersion + 1) {
      throw new NexusApprovalConflictError(
        "Approval version must increase by exactly one.",
      );
    }

    const storedRecord = structuredClone(record);

    this.records.set(storedRecord.approvalId, storedRecord);

    return structuredClone(storedRecord);
  }

  async findById(approvalId: string): Promise<NexusApprovalRecord | null> {
    const record = this.records.get(approvalId);

    return record ? structuredClone(record) : null;
  }

  async findByCommandId(commandId: string): Promise<NexusApprovalRecord[]> {
    return this.findMany({ commandId });
  }

  async findMany(
    query: NexusApprovalQuery = {},
  ): Promise<NexusApprovalRecord[]> {
    return Array.from(this.records.values())
      .filter((record) => matchesQuery(record, query))
      .sort(
        (left, right) =>
          Date.parse(right.requestedAt) - Date.parse(left.requestedAt),
      )
      .map((record) => structuredClone(record));
  }

  async clear(): Promise<void> {
    this.records.clear();
  }
}
