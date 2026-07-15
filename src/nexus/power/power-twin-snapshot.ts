import { nexusAgentRuntime } from "@/nexus/agents";
import type { NexusAgentFinding, NexusAsset } from "@/nexus/contracts";
import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export interface PowerTwinAssetSummary {
  id: string;
  name: string;
  assetType: string;
  status: string;
  healthScore?: number;
  loadPercent?: number;
  voltageV?: number;
  ratedVoltageV?: number;
  frequencyHz?: number;
  ratedPowerKva?: number;
  ratedPowerKw?: number;
  parentAssetId?: string;
}

export interface PowerTwinSnapshot {
  generatedAt: string;
  simulationOnly: true;
  assetCount: number;
  transformerCount: number;
  generatorCount: number;
  atsCount: number;
  onlineCount: number;
  standbyCount: number;
  abnormalCount: number;
  averageTransformerLoadPercent: number | null;
  highestTransformerLoadPercent: number | null;
  assets: PowerTwinAssetSummary[];
  finding: NexusAgentFinding | null;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function toPowerAssetSummary(asset: NexusAsset): PowerTwinAssetSummary {
  return {
    id: asset.id,
    name: asset.name,
    assetType: asset.assetType,
    status: asset.status,
    healthScore: asset.healthScore,
    loadPercent: readFiniteNumber(asset.metadata.loadPercent),
    voltageV: readFiniteNumber(asset.metadata.voltageV),
    ratedVoltageV: readFiniteNumber(asset.metadata.ratedVoltageV),
    frequencyHz: readFiniteNumber(asset.metadata.frequencyHz),
    ratedPowerKva: readFiniteNumber(asset.metadata.ratedPowerKva),
    ratedPowerKw: readFiniteNumber(asset.metadata.ratedPowerKw),
    parentAssetId: asset.parentAssetId,
  };
}

export async function createPowerTwinSnapshot(): Promise<PowerTwinSnapshot> {
  await initializeNexusAssets();

  const powerAssets = await nexusAssetRegistry.list({
    twinType: "power",
  });

  const assets = powerAssets
    .map(toPowerAssetSummary)
    .sort((left, right) => left.id.localeCompare(right.id));

  const transformers = assets.filter(
    (asset) => asset.assetType === "transformer",
  );

  const transformerLoads = transformers
    .map((asset) => asset.loadPercent)
    .filter((value): value is number => value !== undefined);

  const agentResult = await nexusAgentRuntime.run({
    agentId: "power-operations-agent",
    requestedBy: "lumi-nexus-power-dashboard",
    targetTwin: "power",
  });

  const abnormalStatuses = new Set([
    "warning",
    "fault",
    "offline",
    "unavailable",
  ]);

  return {
    generatedAt: new Date().toISOString(),
    simulationOnly: true,
    assetCount: assets.length,
    transformerCount: transformers.length,
    generatorCount: assets.filter((asset) => asset.assetType === "generator")
      .length,
    atsCount: assets.filter(
      (asset) => asset.assetType === "automatic-transfer-switch",
    ).length,
    onlineCount: assets.filter((asset) =>
      ["online", "running"].includes(asset.status),
    ).length,
    standbyCount: assets.filter((asset) => asset.status === "standby").length,
    abnormalCount: assets.filter((asset) => abnormalStatuses.has(asset.status))
      .length,
    averageTransformerLoadPercent:
      transformerLoads.length > 0
        ? transformerLoads.reduce((sum, value) => sum + value, 0) /
          transformerLoads.length
        : null,
    highestTransformerLoadPercent:
      transformerLoads.length > 0 ? Math.max(...transformerLoads) : null,
    assets,
    finding: agentResult.findings[0] ?? null,
  };
}
