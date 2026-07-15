import { randomUUID } from "node:crypto";

import type {
  NexusAgent,
  NexusAgentExecutionContext,
  NexusAgentRunRequest,
} from "@/nexus/agents/nexus-agent";

export const nexusOrchestratorAgent: NexusAgent = {
  agentId: "nexus-orchestrator-agent",
  name: "Nexus Orchestrator Agent",
  description:
    "Produces a deterministic cross-domain operational summary without executing control actions.",
  supportedTwins: [
    "hvac",
    "power",
    "energy",
    "maintenance",
    "safety",
    "passenger-flow",
    "flight-operations",
  ],
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

    const twinCounts = assets.reduce<Record<string, number>>(
      (counts, asset) => {
        counts[asset.twinType] = (counts[asset.twinType] ?? 0) + 1;

        return counts;
      },
      {},
    );

    const abnormalAssets = assets.filter((asset) =>
      ["warning", "fault", "offline", "unavailable"].includes(asset.status),
    );

    return [
      {
        findingId: randomUUID(),
        agentId: "nexus-orchestrator-agent",
        sourceTwin: request.targetTwin ?? "hvac",
        assetId: request.targetAssetId,
        title: "Nexus operational domain summary",
        explanation:
          `The orchestrator reviewed ${assets.length} registered assets ` +
          `across ${Object.keys(twinCounts).length} connected domain twins. ` +
          `${abnormalAssets.length} assets are currently in abnormal states.`,
        evidence: [
          {
            source: "nexus-asset-registry",
            description: "Cross-domain registered asset summary.",
            value: {
              totalAssets: assets.length,
              twinCounts,
              abnormalAssetIds: abnormalAssets.map((asset) => asset.id),
            },
            timestamp: context.now().toISOString(),
          },
        ],
        confidence: 1,
        severity: abnormalAssets.length > 0 ? "medium" : "info",
        recommendedActions: [],
        createdAt: context.now().toISOString(),
      },
    ];
  },
};
