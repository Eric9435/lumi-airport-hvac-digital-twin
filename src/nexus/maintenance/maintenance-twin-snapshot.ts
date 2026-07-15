import { nexusAgentRuntime } from "@/nexus/agents";
import type { NexusAgentFinding, NexusAsset } from "@/nexus/contracts";
import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export type MaintenancePriority = "critical" | "high" | "medium" | "low";

export interface MaintenanceAssetSummary {
  assetId: string;
  assetName: string;
  twinType: string;
  assetType: string;
  status: string;
  healthScore: number | null;
  priority: MaintenancePriority;
  mtbfHours: number | null;
  mttrHours: number | null;
  failureProbability: number | null;
  nextServiceDate: string | null;
  serviceDue: boolean;
  estimatedMaintenanceCost: number | null;
  maintenanceSource: string;
}

export interface MaintenanceTwinSnapshot {
  generatedAt: string;
  simulationOnly: true;
  sourceAssetCount: number;
  monitoredAssetCount: number;
  criticalAssetCount: number;
  highPriorityAssetCount: number;
  serviceDueCount: number;
  averageHealthScore: number | null;
  estimatedMaintenanceCost: number | null;
  assets: MaintenanceAssetSummary[];
  finding: NexusAgentFinding | null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readFirstNumber(asset: NexusAsset, keys: string[]): number | null {
  for (const key of keys) {
    const value = readFiniteNumber(asset.metadata[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function readFirstString(asset: NexusAsset, keys: string[]): string | null {
  for (const key of keys) {
    const value = readString(asset.metadata[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function normalizeFailureProbability(value: number | null): number | null {
  if (value === null) {
    return null;
  }

  if (value > 1 && value <= 100) {
    return value / 100;
  }

  return Math.min(1, Math.max(0, value));
}

function isServiceDue(nextServiceDate: string | null, now: Date): boolean {
  if (!nextServiceDate) {
    return false;
  }

  const parsed = new Date(nextServiceDate);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() <= now.getTime();
}

function determinePriority(
  asset: NexusAsset,
  healthScore: number | null,
  failureProbability: number | null,
  serviceDue: boolean,
): MaintenancePriority {
  if (
    ["fault", "offline", "unavailable"].includes(asset.status) ||
    (healthScore !== null && healthScore < 40) ||
    (failureProbability !== null && failureProbability >= 0.8)
  ) {
    return "critical";
  }

  if (
    asset.status === "warning" ||
    (healthScore !== null && healthScore < 60) ||
    (failureProbability !== null && failureProbability >= 0.5) ||
    serviceDue
  ) {
    return "high";
  }

  if (
    asset.status === "maintenance" ||
    (healthScore !== null && healthScore < 80) ||
    (failureProbability !== null && failureProbability >= 0.25)
  ) {
    return "medium";
  }

  return "low";
}

function priorityRank(priority: MaintenancePriority): number {
  return {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  }[priority];
}

function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function toMaintenanceSummary(
  asset: NexusAsset,
  now: Date,
): MaintenanceAssetSummary {
  const healthScore = readFiniteNumber(asset.healthScore);

  const mtbfHours = readFirstNumber(asset, [
    "mtbfHours",
    "meanTimeBetweenFailuresHours",
  ]);

  const mttrHours = readFirstNumber(asset, [
    "mttrHours",
    "meanTimeToRepairHours",
  ]);

  const failureProbability = normalizeFailureProbability(
    readFirstNumber(asset, [
      "failureProbability",
      "failureRisk",
      "predictedFailureProbability",
    ]),
  );

  const nextServiceDate = readFirstString(asset, [
    "nextServiceDate",
    "nextMaintenanceDate",
    "serviceDueDate",
  ]);

  const serviceDue = isServiceDue(nextServiceDate, now);

  const estimatedMaintenanceCost = readFirstNumber(asset, [
    "estimatedMaintenanceCost",
    "maintenanceCost",
    "estimatedRepairCost",
  ]);

  const priority = determinePriority(
    asset,
    healthScore,
    failureProbability,
    serviceDue,
  );

  return {
    assetId: asset.id,
    assetName: asset.name,
    twinType: asset.twinType,
    assetType: asset.assetType,
    status: asset.status,
    healthScore,
    priority,
    mtbfHours,
    mttrHours,
    failureProbability,
    nextServiceDate,
    serviceDue,
    estimatedMaintenanceCost,
    maintenanceSource: "nexus-central-asset-registry",
  };
}

export async function createMaintenanceTwinSnapshot(): Promise<MaintenanceTwinSnapshot> {
  await initializeNexusAssets();

  const now = new Date();
  const sourceAssets = await nexusAssetRegistry.list();

  const assets = sourceAssets
    .map((asset) => toMaintenanceSummary(asset, now))
    .sort((left, right) => {
      const priorityDifference =
        priorityRank(right.priority) - priorityRank(left.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return (left.healthScore ?? 100) - (right.healthScore ?? 100);
    });

  const healthScores = assets
    .map((asset) => asset.healthScore)
    .filter((value): value is number => value !== null);

  const maintenanceCosts = assets
    .map((asset) => asset.estimatedMaintenanceCost)
    .filter((value): value is number => value !== null);

  let finding: NexusAgentFinding | null = null;

  try {
    const result = await nexusAgentRuntime.run({
      agentId: "maintenance-intelligence-agent",
      requestedBy: "lumi-nexus-maintenance-dashboard",
      targetTwin: "maintenance",
    });

    finding = result.findings[0] ?? null;
  } catch {
    finding = null;
  }

  return {
    generatedAt: now.toISOString(),
    simulationOnly: true,
    sourceAssetCount: sourceAssets.length,
    monitoredAssetCount: assets.length,
    criticalAssetCount: assets.filter((asset) => asset.priority === "critical")
      .length,
    highPriorityAssetCount: assets.filter((asset) => asset.priority === "high")
      .length,
    serviceDueCount: assets.filter((asset) => asset.serviceDue).length,
    averageHealthScore:
      healthScores.length > 0
        ? round(
            healthScores.reduce((sum, score) => sum + score, 0) /
              healthScores.length,
          )
        : null,
    estimatedMaintenanceCost:
      maintenanceCosts.length > 0
        ? round(maintenanceCosts.reduce((sum, cost) => sum + cost, 0))
        : null,
    assets,
    finding,
  };
}
