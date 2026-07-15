import { randomUUID } from "node:crypto";

import type {
  NexusAgent,
  NexusAgentExecutionContext,
  NexusAgentRunRequest,
} from "@/nexus/agents/nexus-agent";

export const maintenanceIntelligenceAgent: NexusAgent = {
  agentId: "maintenance-intelligence-agent",
  name: "Maintenance Intelligence Agent",
  description:
    "Deterministically identifies registered assets that require maintenance attention.",
  supportedTwins: ["hvac", "power", "maintenance"],
  deterministic: true,
  llmReady: true,

  async run(
    request: NexusAgentRunRequest,
    context: NexusAgentExecutionContext,
  ) {
    const assets = await context.assetRegistry.list(
      request.targetTwin
        ? {
            twinType: request.targetTwin,
          }
        : {},
    );

    const scopedAssets = request.targetAssetId
      ? assets.filter((asset) => asset.id === request.targetAssetId)
      : assets;

    const criticalAssets = scopedAssets.filter(
      (asset) =>
        asset.status === "fault" ||
        asset.status === "offline" ||
        (asset.healthScore !== undefined && asset.healthScore < 50),
    );

    const warningAssets = scopedAssets.filter(
      (asset) =>
        asset.status === "warning" ||
        (asset.healthScore !== undefined &&
          asset.healthScore >= 50 &&
          asset.healthScore < 70),
    );

    const severity =
      criticalAssets.length > 0
        ? "high"
        : warningAssets.length > 0
          ? "medium"
          : "info";

    return [
      {
        findingId: randomUUID(),
        agentId: "maintenance-intelligence-agent",
        sourceTwin: request.targetTwin ?? "maintenance",
        assetId: request.targetAssetId,
        title:
          severity === "info"
            ? "No immediate maintenance risk identified"
            : "Assets require maintenance review",
        explanation:
          `Evaluated ${scopedAssets.length} registered assets. ` +
          `${criticalAssets.length} require urgent review and ` +
          `${warningAssets.length} require planned inspection.`,
        evidence: [
          {
            source: "nexus-asset-registry",
            description: "Asset status and health-score maintenance screening.",
            value: {
              evaluatedAssets: scopedAssets.length,
              criticalAssetIds: criticalAssets.map((asset) => asset.id),
              warningAssetIds: warningAssets.map((asset) => asset.id),
            },
            timestamp: context.now().toISOString(),
          },
        ],
        confidence: 1,
        severity,
        recommendedActions:
          criticalAssets.length + warningAssets.length > 0
            ? [
                {
                  actionId: randomUUID(),
                  title: "Create maintenance inspections",
                  description:
                    "Create condition-based inspections for assets identified by deterministic status and health thresholds.",
                  priority: criticalAssets.length > 0 ? "high" : "medium",
                  requiresHumanApproval: false,
                  commandAction: "maintenance.inspections.create",
                  parameters: {
                    assetIds: [...criticalAssets, ...warningAssets].map(
                      (asset) => asset.id,
                    ),
                  },
                },
              ]
            : [],
        createdAt: context.now().toISOString(),
      },
    ];
  },
};
