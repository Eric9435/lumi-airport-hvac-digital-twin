import { createNexusPlatformSnapshot } from "@/nexus/platform";

export interface NexusOperationsSnapshot {
  generatedAt: string;
  platformStatus: "operational" | "degraded";
  registeredAssets: number;
  registeredAgents: number;
  pendingApprovals: number;
  eventCount: number;
  criticalEventCount: number;
  approvalRequiredEventCount: number;
  agents: {
    agentId: string;
    name: string;
    description: string;
    supportedTwins: readonly string[];
    runtimeMode: "deterministic";
    llmReady: boolean;
  }[];
  approvals: {
    approvalId: string;
    commandId: string;
    targetTwin: string;
    targetAssetId?: string;
    action: string;
    riskLevel: string;
    status: string;
    requestedBy: string;
    requestedAt: string;
    expiresAt: string;
  }[];
  events: {
    eventId: string;
    eventType: string;
    sourceTwin: string;
    assetId?: string;
    severity: string;
    timestamp: string;
    requiresHumanApproval: boolean;
    correlationId: string;
  }[];
  controls: {
    autonomousPhysicalControl: false;
    humanApprovalWorkflow: true;
    deterministicAgentRuntime: true;
    auditReady: true;
  };
}

export async function createNexusOperationsSnapshot(): Promise<NexusOperationsSnapshot> {
  const platform = await createNexusPlatformSnapshot(100);

  const events = platform.recentEvents.map((event) => ({
    eventId: event.eventId,
    eventType: event.eventType,
    sourceTwin: event.sourceTwin,
    assetId: event.assetId,
    severity: event.severity,
    timestamp: event.timestamp,
    requiresHumanApproval: event.requiresHumanApproval,
    correlationId: event.correlationId,
  }));

  return {
    generatedAt: platform.generatedAt,
    platformStatus: platform.health.status,
    registeredAssets: platform.health.registeredNexusAssets,
    registeredAgents: platform.health.registeredAgents,
    pendingApprovals: platform.health.pendingApprovals,
    eventCount: events.length,
    criticalEventCount: events.filter((event) => event.severity === "critical")
      .length,
    approvalRequiredEventCount: events.filter(
      (event) => event.requiresHumanApproval,
    ).length,
    agents: platform.agents.map((agent) => ({
      agentId: agent.agentId,
      name: agent.name,
      description: agent.description,
      supportedTwins: agent.supportedTwins,
      runtimeMode: "deterministic",
      llmReady: agent.llmReady,
    })),
    approvals: platform.approvals,
    events,
    controls: {
      autonomousPhysicalControl: false,
      humanApprovalWorkflow: true,
      deterministicAgentRuntime: true,
      auditReady: true,
    },
  };
}
