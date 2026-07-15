import { describe, expect, it } from "vitest";

import {
  InMemoryNexusApprovalRepository,
  NEXUS_APPROVAL_PERMISSIONS,
  NexusApprovalAuthorizationError,
  NexusApprovalConflictError,
  NexusApprovalService,
  NexusApprovalTransitionError,
  determineNexusActionRisk,
  requiresNexusHumanApproval,
} from "@/nexus/approvals";
import { NexusEventBus } from "@/nexus/events";
import { NEXUS_EVENT_TYPES } from "@/nexus/events/nexus-event-types";

function createTestService(options?: { clock?: () => Date }) {
  const repository = new InMemoryNexusApprovalRepository();

  const eventBus = new NexusEventBus({
    maxHistorySize: 100,
  });

  const service = new NexusApprovalService(repository, eventBus, {
    clock: options?.clock,
  });

  return {
    repository,
    eventBus,
    service,
  };
}

async function createPendingApproval(service: NexusApprovalService) {
  return service.request({
    commandId: "command-001",
    targetTwin: "hvac",
    targetAssetId: "CH-01",
    action: "plant.stop-all",
    parameters: {},
    reason: "Emergency plant shutdown verification.",
    riskLevel: "critical",
    requestedBy: "operator-001",
    expiresInSeconds: 900,
  });
}

describe("NexusApprovalService", () => {
  it("creates a pending approval and publishes an event", async () => {
    const { eventBus, service } = createTestService();

    const approval = await createPendingApproval(service);

    expect(approval.status).toBe("pending");
    expect(approval.version).toBe(1);

    const events = eventBus.getHistory({
      eventType: NEXUS_EVENT_TYPES.APPROVAL_REQUESTED,
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.payload.approvalId).toBe(approval.approvalId);
  });

  it("prevents unauthorized approval decisions", async () => {
    const { service } = createTestService();
    const approval = await createPendingApproval(service);

    await expect(
      service.approve(approval.approvalId, {
        actorId: "unauthorized-user",
        permissions: [],
      }),
    ).rejects.toBeInstanceOf(NexusApprovalAuthorizationError);
  });

  it("approves and executes a command through valid transitions", async () => {
    const { eventBus, service } = createTestService();
    const approval = await createPendingApproval(service);

    const approved = await service.approve(
      approval.approvalId,
      {
        actorId: "duty-engineer",
        permissions: [NEXUS_APPROVAL_PERMISSIONS.DECIDE],
      },
      "Plant shutdown is authorized.",
    );

    expect(approved.status).toBe("approved");
    expect(approved.decidedBy).toBe("duty-engineer");
    expect(await service.isExecutable(approval.commandId)).toBe(true);

    const executed = await service.markExecuted(approval.approvalId, {
      actorId: "control-service",
      permissions: [NEXUS_APPROVAL_PERMISSIONS.EXECUTE],
    });

    expect(executed.status).toBe("executed");
    expect(executed.executedBy).toBe("control-service");
    expect(await service.isExecutable(approval.commandId)).toBe(false);

    expect(
      eventBus.getHistory({
        eventType: NEXUS_EVENT_TYPES.APPROVAL_EXECUTED,
      }),
    ).toHaveLength(1);
  });

  it("rejects an approval with a recorded decision", async () => {
    const { service } = createTestService();
    const approval = await createPendingApproval(service);

    const rejected = await service.reject(
      approval.approvalId,
      {
        actorId: "safety-manager",
        permissions: [NEXUS_APPROVAL_PERMISSIONS.DECIDE],
      },
      "Operational conditions do not justify shutdown.",
    );

    expect(rejected.status).toBe("rejected");
    expect(rejected.decidedBy).toBe("safety-manager");
    expect(rejected.decisionComment).toContain("do not justify");
  });

  it("expires pending approvals after their deadline", async () => {
    let currentTime = new Date("2026-07-15T00:00:00.000Z");

    const { service } = createTestService({
      clock: () => new Date(currentTime),
    });

    const approval = await service.request({
      commandId: "command-expiring",
      targetTwin: "power",
      targetAssetId: "POWER-TR-01",
      action: "power.transfer-source",
      parameters: {},
      reason: "Transfer electrical source.",
      riskLevel: "critical",
      requestedBy: "operator-002",
      expiresInSeconds: 60,
    });

    currentTime = new Date("2026-07-15T00:01:01.000Z");

    const expired = await service.getById(approval.approvalId);

    expect(expired.status).toBe("expired");

    await expect(
      service.approve(approval.approvalId, {
        actorId: "engineer",
        permissions: [NEXUS_APPROVAL_PERMISSIONS.DECIDE],
      }),
    ).rejects.toBeInstanceOf(NexusApprovalTransitionError);
  });

  it("prevents execution before approval", async () => {
    const { service } = createTestService();
    const approval = await createPendingApproval(service);

    await expect(
      service.markExecuted(approval.approvalId, {
        actorId: "control-service",
        permissions: [NEXUS_APPROVAL_PERMISSIONS.EXECUTE],
      }),
    ).rejects.toBeInstanceOf(NexusApprovalTransitionError);
  });

  it("uses optimistic version checks to prevent stale writes", async () => {
    const { repository, service } = createTestService();
    const approval = await createPendingApproval(service);

    const firstUpdate = {
      ...approval,
      reason: "Updated reason",
      version: approval.version + 1,
    };

    await repository.update(firstUpdate, approval.version);

    await expect(
      repository.update(
        {
          ...approval,
          reason: "Stale update",
          version: approval.version + 1,
        },
        approval.version,
      ),
    ).rejects.toBeInstanceOf(NexusApprovalConflictError);
  });

  it("classifies high-impact actions correctly", () => {
    expect(requiresNexusHumanApproval("plant.stop-all")).toBe(true);

    expect(requiresNexusHumanApproval("power.transfer-source")).toBe(true);

    expect(requiresNexusHumanApproval("status.read")).toBe(false);

    expect(determineNexusActionRisk("plant.emergency-shutdown")).toBe(
      "critical",
    );

    expect(determineNexusActionRisk("plant.start-all")).toBe("high");
  });
});
