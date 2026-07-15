import type {
  NexusApprovalRecord,
  NexusApprovalRecordStatus,
  NexusTwinType,
} from "@/nexus/contracts";

export interface NexusApprovalQuery {
  commandId?: string;
  targetTwin?: NexusTwinType;
  targetAssetId?: string;
  requestedBy?: string;
  status?: NexusApprovalRecordStatus;
}

export interface NexusApprovalRepository {
  create(record: NexusApprovalRecord): Promise<NexusApprovalRecord>;

  update(
    record: NexusApprovalRecord,
    expectedVersion: number,
  ): Promise<NexusApprovalRecord>;

  findById(approvalId: string): Promise<NexusApprovalRecord | null>;

  findByCommandId(commandId: string): Promise<NexusApprovalRecord[]>;

  findMany(query?: NexusApprovalQuery): Promise<NexusApprovalRecord[]>;

  clear(): Promise<void>;
}
