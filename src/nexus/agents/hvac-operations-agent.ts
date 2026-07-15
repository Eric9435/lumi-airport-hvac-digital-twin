import { randomUUID } from "node:crypto";

import type { NexusAgentFinding, NexusSeverity } from "@/nexus/contracts";
import type {
  NexusAgent,
  NexusAgentExecutionContext,
  NexusAgentRunRequest,
} from "@/nexus/agents/nexus-agent";

function severityFromAssetState(
  faultCount: number,
  warningCount: number,
  offlineCount: number,
): NexusSeverity {
  if (faultCount > 0 || offlineCount > 0) {
    return "high";
  }

  if (warningCount > 0) {
    return "medium";
  }

  return "info";
}

export const hvacOperationsAgent: NexusAgent = {
  agentId: "hvac-operations-agent",
  name: "HVAC Operations Agent",
  description:
    "Deterministically evaluates registered HVAC asset availability and health.",
  supportedTwins: ["hvac"],
  deterministic: true,
  llmReady: true,

  async run(
    request: NexusAgentRunRequest,
    context: NexusAgentExecutionContext,
  ): Promise<NexusAgentFinding[]> {
    const assets = await context.assetRegistry.list({
      twinType: "hvac",
    });

    const scopedAssets = request.targetAssetId
      ? assets.filter((asset) => asset.id === request.targetAssetId)
      : assets;

    const runningCount = scopedAssets.filter(
      (asset) => asset.status === "running",
    ).length;

    const stoppedCount = scopedAssets.filter(
      (asset) => asset.status === "stopped",
    ).length;

    const warningAssets = scopedAssets.filter(
      (asset) => asset.status === "warning",
    );

    const faultAssets = scopedAssets.filter(
      (asset) => asset.status === "fault",
    );

    const offlineAssets = scopedAssets.filter(
      (asset) => asset.status === "offline",
    );

    const degradedAssets = scopedAssets.filter(
      (asset) => asset.healthScore !== undefined && asset.healthScore < 70,
    );

    const severity = severityFromAssetState(
      faultAssets.length,
      warningAssets.length,
      offlineAssets.length,
    );

    const recommendations = [];

    if (faultAssets.length > 0 || offlineAssets.length > 0) {
      recommendations.push({
        actionId: randomUUID(),
        title: "Review unavailable HVAC assets",
        description:
          "Verify field status, interlocks and safe standby capacity before changing plant operation.",
        priority: "high" as const,
        requiresHumanApproval: false,
        commandAction: "hvac.assets.inspect",
        parameters: {
          assetIds: [...faultAssets, ...offlineAssets].map((asset) => asset.id),
        },
      });
    }

    if (degradedAssets.length > 0) {
      recommendations.push({
        actionId: randomUUID(),
        title: "Schedule condition-based inspection",
        description:
          "Inspect HVAC assets with health scores below 70 during the next safe maintenance window.",
        priority: "medium" as const,
        requiresHumanApproval: false,
        commandAction: "maintenance.inspection.create",
        parameters: {
          assetIds: degradedAssets.map((asset) => asset.id),
        },
      });
    }

    return [
      {
        findingId: randomUUID(),
        agentId: "hvac-operations-agent",
        sourceTwin: "hvac",
        assetId: request.targetAssetId,
        title:
          severity === "info"
            ? "HVAC asset registry is operational"
            : "HVAC assets require operational review",
        explanation:
          `Evaluated ${scopedAssets.length} HVAC assets. ` +
          `${runningCount} running, ${stoppedCount} stopped, ` +
          `${warningAssets.length} warning, ${faultAssets.length} faulted, ` +
          `${offlineAssets.length} offline and ${degradedAssets.length} with health scores below 70.`,
        evidence: [
          {
            source: "nexus-asset-registry",
            description: "Current registered HVAC asset state summary.",
            value: {
              totalAssets: scopedAssets.length,
              runningCount,
              stoppedCount,
              warningCount: warningAssets.length,
              faultCount: faultAssets.length,
              offlineCount: offlineAssets.length,
              degradedCount: degradedAssets.length,
            },
            timestamp: context.now().toISOString(),
          },
        ],
        confidence: 1,
        severity,
        recommendedActions: recommendations,
        createdAt: context.now().toISOString(),
      },
    ];
  },
};
