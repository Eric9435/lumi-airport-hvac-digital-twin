import { randomUUID } from "node:crypto";

import type {
  CreateNexusApprovalRequest,
  NexusApprovalActor,
  NexusApprovalRecord,
  NexusApprovalRiskLevel,
} from "@/nexus/contracts";
import {
  createNexusApprovalRequestSchema,
  nexusApprovalActorSchema,
  nexusApprovalRecordSchema,
} from "@/nexus/contracts";
import {
  NexusApprovalAuthorizationError,
  NexusApprovalNotFoundError,
  NexusApprovalTransitionError,
} from "@/nexus/approvals/nexus-approval-errors";
import type {
  NexusApprovalQuery,
  NexusApprovalRepository,
} from "@/nexus/approvals/nexus-approval-repository";
import type { NexusEventBus } from "@/nexus/events/nexus-event-bus";
import { NEXUS_EVENT_TYPES } from "@/nexus/events/nexus-event-types";

export interface NexusApprovalServiceOptions {
  clock?: () => Date;
  idFactory?: () => string;
}

const RISK_SEVERITY_MAP = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
} as const satisfies Record<
  NexusApprovalRiskLevel,
  "low" | "medium" | "high" | "critical"
>;

function hasPermission(actor: NexusApprovalActor, permission: string): boolean {
  return (
    actor.permissions.includes("*") || actor.permissions.includes(permission)
  );
}

export class NexusApprovalService {
  private readonly clock: () => Date;

  private readonly idFactory: () => string;

  constructor(
    private readonly repository: NexusApprovalRepository,
    private readonly eventBus: NexusEventBus,
    options: NexusApprovalServiceOptions = {},
  ) {
    this.clock = options.clock ?? (() => new Date());
    this.idFactory = options.idFactory ?? randomUUID;
  }

  async request(
    input: CreateNexusApprovalRequest,
  ): Promise<NexusApprovalRecord> {
    const parsedInput = createNexusApprovalRequestSchema.parse(input);

    const now = this.clock();
    const requestedAt = now.toISOString();
    const expiresAt = new Date(
      now.getTime() + parsedInput.expiresInSeconds * 1_000,
    ).toISOString();

    const record = nexusApprovalRecordSchema.parse({
      approvalId: this.idFactory(),
      commandId: parsedInput.commandId,
      targetTwin: parsedInput.targetTwin,
      targetAssetId: parsedInput.targetAssetId,
      action: parsedInput.action,
      parameters: parsedInput.parameters,
      reason: parsedInput.reason,
      riskLevel: parsedInput.riskLevel,
      requestedBy: parsedInput.requestedBy,
      requestedAt,
      expiresAt,
      status: "pending",
      decisionPermission: parsedInput.decisionPermission,
      executionPermission: parsedInput.executionPermission,
      correlationId: parsedInput.correlationId ?? this.idFactory(),
      version: 1,
    });

    const created = await this.repository.create(record);

    await this.publishTransition(created, NEXUS_EVENT_TYPES.APPROVAL_REQUESTED);

    return created;
  }

  async getById(approvalId: string): Promise<NexusApprovalRecord> {
    const record = await this.requireRecord(approvalId);

    return this.expireIfRequired(record);
  }

  async list(query: NexusApprovalQuery = {}): Promise<NexusApprovalRecord[]> {
    await this.expireDueApprovals();

    return this.repository.findMany(query);
  }

  async approve(
    approvalId: string,
    actorInput: NexusApprovalActor,
    comment?: string,
  ): Promise<NexusApprovalRecord> {
    const actor = nexusApprovalActorSchema.parse(actorInput);
    const record = await this.requirePendingRecord(approvalId);

    this.assertPermission(actor, record.decisionPermission, "approve");

    const decidedAt = this.clock().toISOString();

    const approved = nexusApprovalRecordSchema.parse({
      ...record,
      status: "approved",
      decidedBy: actor.actorId,
      decidedAt,
      decisionComment: comment,
      version: record.version + 1,
    });

    const updated = await this.repository.update(approved, record.version);

    await this.publishTransition(updated, NEXUS_EVENT_TYPES.APPROVAL_APPROVED);

    return updated;
  }

  async reject(
    approvalId: string,
    actorInput: NexusApprovalActor,
    comment: string,
  ): Promise<NexusApprovalRecord> {
    const actor = nexusApprovalActorSchema.parse(actorInput);
    const record = await this.requirePendingRecord(approvalId);

    this.assertPermission(actor, record.decisionPermission, "reject");

    const rejected = nexusApprovalRecordSchema.parse({
      ...record,
      status: "rejected",
      decidedBy: actor.actorId,
      decidedAt: this.clock().toISOString(),
      decisionComment: comment,
      version: record.version + 1,
    });

    const updated = await this.repository.update(rejected, record.version);

    await this.publishTransition(updated, NEXUS_EVENT_TYPES.APPROVAL_REJECTED);

    return updated;
  }

  async markExecuted(
    approvalId: string,
    actorInput: NexusApprovalActor,
  ): Promise<NexusApprovalRecord> {
    const actor = nexusApprovalActorSchema.parse(actorInput);
    const record = await this.requireApprovedRecord(approvalId);

    this.assertPermission(actor, record.executionPermission, "execute");

    const executed = nexusApprovalRecordSchema.parse({
      ...record,
      status: "executed",
      executedBy: actor.actorId,
      executedAt: this.clock().toISOString(),
      version: record.version + 1,
    });

    const updated = await this.repository.update(executed, record.version);

    await this.publishTransition(updated, NEXUS_EVENT_TYPES.APPROVAL_EXECUTED);

    return updated;
  }

  async markFailed(
    approvalId: string,
    actorInput: NexusApprovalActor,
    failureReason: string,
  ): Promise<NexusApprovalRecord> {
    const actor = nexusApprovalActorSchema.parse(actorInput);
    const record = await this.requireApprovedRecord(approvalId);

    this.assertPermission(actor, record.executionPermission, "mark as failed");

    const failed = nexusApprovalRecordSchema.parse({
      ...record,
      status: "failed",
      failureReason,
      version: record.version + 1,
    });

    const updated = await this.repository.update(failed, record.version);

    await this.publishTransition(updated, NEXUS_EVENT_TYPES.APPROVAL_FAILED);

    return updated;
  }

  async expireDueApprovals(): Promise<NexusApprovalRecord[]> {
    const candidates = [
      ...(await this.repository.findMany({
        status: "pending",
      })),
      ...(await this.repository.findMany({
        status: "approved",
      })),
    ];

    const expiredRecords: NexusApprovalRecord[] = [];

    for (const record of candidates) {
      const refreshed = await this.expireIfRequired(record);

      if (refreshed.status === "expired") {
        expiredRecords.push(refreshed);
      }
    }

    return expiredRecords;
  }

  async isExecutable(commandId: string): Promise<boolean> {
    const approvals = await this.repository.findByCommandId(commandId);

    for (const approval of approvals) {
      const refreshed = await this.expireIfRequired(approval);

      if (refreshed.status === "approved") {
        return true;
      }
    }

    return false;
  }

  private async requireRecord(
    approvalId: string,
  ): Promise<NexusApprovalRecord> {
    const record = await this.repository.findById(approvalId);

    if (!record) {
      throw new NexusApprovalNotFoundError(
        `Approval ${approvalId} was not found.`,
      );
    }

    return record;
  }

  private async requirePendingRecord(
    approvalId: string,
  ): Promise<NexusApprovalRecord> {
    const record = await this.expireIfRequired(
      await this.requireRecord(approvalId),
    );

    if (record.status !== "pending") {
      throw new NexusApprovalTransitionError(
        `Approval ${approvalId} cannot be decided from status ${record.status}.`,
      );
    }

    return record;
  }

  private async requireApprovedRecord(
    approvalId: string,
  ): Promise<NexusApprovalRecord> {
    const record = await this.expireIfRequired(
      await this.requireRecord(approvalId),
    );

    if (record.status !== "approved") {
      throw new NexusApprovalTransitionError(
        `Approval ${approvalId} cannot be executed from status ${record.status}.`,
      );
    }

    return record;
  }

  private async expireIfRequired(
    record: NexusApprovalRecord,
  ): Promise<NexusApprovalRecord> {
    const expirable =
      record.status === "pending" || record.status === "approved";

    if (!expirable || this.clock().getTime() < Date.parse(record.expiresAt)) {
      return record;
    }

    const expired = nexusApprovalRecordSchema.parse({
      ...record,
      status: "expired",
      version: record.version + 1,
    });

    const updated = await this.repository.update(expired, record.version);

    await this.publishTransition(updated, NEXUS_EVENT_TYPES.APPROVAL_EXPIRED);

    return updated;
  }

  private assertPermission(
    actor: NexusApprovalActor,
    permission: string,
    operation: string,
  ): void {
    if (!hasPermission(actor, permission)) {
      throw new NexusApprovalAuthorizationError(
        `${actor.actorId} is not authorized to ${operation} this Nexus approval.`,
      );
    }
  }

  private async publishTransition(
    record: NexusApprovalRecord,
    eventType: string,
  ): Promise<void> {
    await this.eventBus.publish({
      sourceTwin: record.targetTwin,
      assetId: record.targetAssetId,
      eventType,
      severity: RISK_SEVERITY_MAP[record.riskLevel],
      correlationId: record.correlationId,
      causationId: record.commandId,
      payload: {
        approvalId: record.approvalId,
        commandId: record.commandId,
        action: record.action,
        status: record.status,
        requestedBy: record.requestedBy,
        decidedBy: record.decidedBy,
        executedBy: record.executedBy,
        riskLevel: record.riskLevel,
      },
      requiresHumanApproval: record.status === "pending",
    });
  }
}
