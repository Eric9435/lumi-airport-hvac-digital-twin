import { nexusAgentRuntime } from "@/nexus/agents";
import type { NexusAgentFinding, NexusAsset } from "@/nexus/contracts";
import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export interface EnergyAssetContribution {
  assetId: string;
  assetName: string;
  twinType: string;
  assetType: string;
  status: string;
  activePowerKw: number;
  estimatedDailyEnergyKwh: number;
  contributionPercent: number;
  measurementSource: string;
}

export interface EnergyTwinSnapshot {
  generatedAt: string;
  simulationOnly: true;
  modelDerived: true;
  sourceAssetCount: number;
  meteredAssetCount: number;
  estimatedDemandKw: number;
  estimatedDailyEnergyKwh: number;
  estimatedMonthlyEnergyKwh: number;
  estimatedMonthlyCost: number | null;
  configuredTariffPerKwh: number | null;
  averagePowerFactor: number | null;
  renewableContributionPercent: number;
  carbonIntensityKgPerKwh: number | null;
  estimatedMonthlyCarbonKg: number | null;
  contributions: EnergyAssetContribution[];
  finding: NexusAgentFinding | null;
}

const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readFirstNumber(
  asset: NexusAsset,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = readFiniteNumber(asset.metadata[key]);

    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function resolveActivePowerKw(asset: NexusAsset): {
  value: number;
  source: string;
} | null {
  const directPower = readFirstNumber(asset, [
    "activePowerKw",
    "currentPowerKw",
    "powerKw",
    "electricalPowerKw",
    "inputPowerKw",
  ]);

  if (directPower !== undefined) {
    return {
      value: Math.max(0, directPower),
      source: "configured-active-power",
    };
  }

  const apparentPowerKva = readFiniteNumber(asset.metadata.apparentPowerKva);

  const powerFactor = readFiniteNumber(asset.metadata.powerFactor);

  if (apparentPowerKva !== undefined && powerFactor !== undefined) {
    return {
      value: Math.max(0, apparentPowerKva * powerFactor),
      source: "derived-from-kva-and-power-factor",
    };
  }

  const ratedPowerKw = readFiniteNumber(asset.metadata.ratedPowerKw);

  const loadPercent = readFiniteNumber(asset.metadata.loadPercent);

  if (ratedPowerKw !== undefined && loadPercent !== undefined) {
    return {
      value: Math.max(0, ratedPowerKw * (loadPercent / 100)),
      source: "derived-from-rated-power-and-load",
    };
  }

  const ratedPowerKva = readFiniteNumber(asset.metadata.ratedPowerKva);

  if (ratedPowerKva !== undefined && loadPercent !== undefined) {
    return {
      value: Math.max(
        0,
        ratedPowerKva * (loadPercent / 100) * (powerFactor ?? 0.9),
      ),
      source: "derived-from-rated-kva-and-load",
    };
  }

  return null;
}

function resolveUtilizationFactor(asset: NexusAsset): number {
  const configured = readFirstNumber(asset, [
    "utilizationFactor",
    "dailyUtilizationFactor",
    "operatingFactor",
  ]);

  if (configured !== undefined) {
    return Math.min(1, Math.max(0, configured));
  }

  if (
    asset.status === "offline" ||
    asset.status === "stopped" ||
    asset.status === "unavailable"
  ) {
    return 0;
  }

  if (asset.status === "standby") {
    return 0.08;
  }

  return 0.65;
}

function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

export async function createEnergyTwinSnapshot(): Promise<EnergyTwinSnapshot> {
  await initializeNexusAssets();

  const assets = await nexusAssetRegistry.list();

  const rawContributions: EnergyAssetContribution[] = assets.flatMap(
    (asset) => {
      const resolvedPower = resolveActivePowerKw(asset);

      if (!resolvedPower) {
        return [];
      }

      const utilizationFactor = resolveUtilizationFactor(asset);

      const contribution: EnergyAssetContribution = {
        assetId: asset.id,
        assetName: asset.name,
        twinType: asset.twinType,
        assetType: asset.assetType,
        status: asset.status,
        activePowerKw: resolvedPower.value,
        estimatedDailyEnergyKwh:
          resolvedPower.value * HOURS_PER_DAY * utilizationFactor,
        contributionPercent: 0,
        measurementSource: resolvedPower.source,
      };

      return [contribution];
    },
  );

  const estimatedDemandKw = rawContributions.reduce(
    (sum, contribution) => sum + contribution.activePowerKw,
    0,
  );

  const estimatedDailyEnergyKwh = rawContributions.reduce(
    (sum, contribution) => sum + contribution.estimatedDailyEnergyKwh,
    0,
  );

  const estimatedMonthlyEnergyKwh = estimatedDailyEnergyKwh * DAYS_PER_MONTH;

  const configuredTariffPerKwh =
    readFirstNumber(
      assets.find(
        (asset) =>
          readFirstNumber(asset, ["tariffPerKwh", "energyTariffPerKwh"]) !==
          undefined,
      ) ?? assets[0]!,
      ["tariffPerKwh", "energyTariffPerKwh"],
    ) ?? null;

  const carbonIntensityKgPerKwh =
    readFirstNumber(
      assets.find(
        (asset) =>
          readFirstNumber(asset, ["carbonIntensityKgPerKwh"]) !== undefined,
      ) ?? assets[0]!,
      ["carbonIntensityKgPerKwh"],
    ) ?? null;

  const powerFactors = assets
    .map((asset) => readFiniteNumber(asset.metadata.powerFactor))
    .filter((value): value is number => value !== undefined);

  const averagePowerFactor =
    powerFactors.length > 0
      ? powerFactors.reduce((sum, value) => sum + value, 0) /
        powerFactors.length
      : null;

  const contributions = rawContributions
    .map((contribution) => ({
      ...contribution,
      activePowerKw: round(contribution.activePowerKw),
      estimatedDailyEnergyKwh: round(contribution.estimatedDailyEnergyKwh),
      contributionPercent:
        estimatedDemandKw > 0
          ? round((contribution.activePowerKw / estimatedDemandKw) * 100)
          : 0,
    }))
    .sort((left, right) => right.activePowerKw - left.activePowerKw);

  let finding: NexusAgentFinding | null = null;

  try {
    const result = await nexusAgentRuntime.run({
      agentId: "energy-intelligence-agent",
      requestedBy: "lumi-nexus-energy-dashboard",
      targetTwin: "energy",
    });

    finding = result.findings[0] ?? null;
  } catch {
    finding = null;
  }

  return {
    generatedAt: new Date().toISOString(),
    simulationOnly: true,
    modelDerived: true,
    sourceAssetCount: assets.length,
    meteredAssetCount: contributions.length,
    estimatedDemandKw: round(estimatedDemandKw),
    estimatedDailyEnergyKwh: round(estimatedDailyEnergyKwh),
    estimatedMonthlyEnergyKwh: round(estimatedMonthlyEnergyKwh),
    estimatedMonthlyCost:
      configuredTariffPerKwh === null
        ? null
        : round(estimatedMonthlyEnergyKwh * configuredTariffPerKwh),
    configuredTariffPerKwh,
    averagePowerFactor:
      averagePowerFactor === null ? null : round(averagePowerFactor, 3),
    renewableContributionPercent: 0,
    carbonIntensityKgPerKwh,
    estimatedMonthlyCarbonKg:
      carbonIntensityKgPerKwh === null
        ? null
        : round(estimatedMonthlyEnergyKwh * carbonIntensityKgPerKwh),
    contributions,
    finding,
  };
}
