import type { NexusAsset } from "@/nexus/contracts";
import { initializeNexusAssets, nexusAssetRegistry } from "@/nexus/registry";

export type PassengerFlowLevel = "normal" | "elevated" | "high" | "critical";

export interface PassengerZoneSummary {
  zoneId: string;
  zoneName: string;
  terminalId: string;
  supportingAssetCount: number;
  configuredCapacity: number | null;
  estimatedOccupancy: number;
  occupancyPercent: number | null;
  estimatedArrivalRatePerHour: number;
  estimatedDepartureRatePerHour: number;
  flowLevel: PassengerFlowLevel;
  dataSource: string;
}

export interface PassengerFlowTwinSnapshot {
  generatedAt: string;
  simulationOnly: true;
  modelDerived: true;
  totalZones: number;
  supportingAssetCount: number;
  estimatedPassengers: number;
  totalConfiguredCapacity: number | null;
  averageOccupancyPercent: number | null;
  highFlowZoneCount: number;
  criticalFlowZoneCount: number;
  estimatedArrivalRatePerHour: number;
  estimatedDepartureRatePerHour: number;
  zones: PassengerZoneSummary[];
  controls: {
    autonomousPassengerRouting: false;
    gateControlEnabled: false;
    publicAnnouncementControlEnabled: false;
    humanApprovalRequired: true;
  };
}

interface MutableZoneModel {
  zoneId: string;
  zoneName: string;
  terminalId: string;
  supportingAssetCount: number;
  configuredCapacity: number | null;
  estimatedOccupancy: number;
  estimatedArrivalRatePerHour: number;
  estimatedDepartureRatePerHour: number;
  dataSources: Set<string>;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
    const value = asset.metadata[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveZoneId(asset: NexusAsset): string {
  return (
    asset.zoneId ??
    readFirstString(asset, [
      "zoneId",
      "airportZoneId",
      "servedZoneId",
      "areaId",
    ]) ??
    asset.terminalId ??
    readFirstString(asset, ["terminalId", "buildingId"]) ??
    "AIRPORT-GENERAL"
  );
}

function resolveTerminalId(asset: NexusAsset): string {
  return (
    asset.terminalId ??
    readFirstString(asset, ["terminalId", "buildingId"]) ??
    "AIRPORT"
  );
}

function resolveZoneName(asset: NexusAsset, zoneId: string): string {
  return (
    readFirstString(asset, [
      "zoneName",
      "servedZoneName",
      "areaName",
      "locationName",
    ]) ?? zoneId
  );
}

function resolveCapacity(asset: NexusAsset): number | null {
  return readFirstNumber(asset, [
    "passengerCapacity",
    "designOccupancy",
    "zoneCapacity",
    "maximumOccupancy",
    "maxOccupancy",
  ]);
}

function resolveOccupancy(asset: NexusAsset): number {
  return (
    readFirstNumber(asset, [
      "expectedPassengers",
      "currentOccupancy",
      "estimatedOccupancy",
      "passengerCount",
      "occupancy",
    ]) ?? 0
  );
}

function resolveArrivalRate(asset: NexusAsset): number {
  return (
    readFirstNumber(asset, [
      "passengerArrivalRatePerHour",
      "arrivalRatePerHour",
      "arrivalsPerHour",
    ]) ?? 0
  );
}

function resolveDepartureRate(asset: NexusAsset): number {
  return (
    readFirstNumber(asset, [
      "passengerDepartureRatePerHour",
      "departureRatePerHour",
      "departuresPerHour",
    ]) ?? 0
  );
}

function determineFlowLevel(
  occupancyPercent: number | null,
  arrivalRate: number,
  departureRate: number,
): PassengerFlowLevel {
  if (occupancyPercent !== null && occupancyPercent >= 100) {
    return "critical";
  }

  if (occupancyPercent !== null && occupancyPercent >= 85) {
    return "high";
  }

  if (occupancyPercent !== null && occupancyPercent >= 70) {
    return "elevated";
  }

  const netArrivalRate = arrivalRate - departureRate;

  if (netArrivalRate >= 500) {
    return "high";
  }

  if (netArrivalRate >= 200) {
    return "elevated";
  }

  return "normal";
}

function round(value: number, digits = 1): number {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function buildZoneModels(assets: NexusAsset[]): PassengerZoneSummary[] {
  const zones = new Map<string, MutableZoneModel>();

  const supportingAssets = assets.filter(
    (asset) =>
      asset.twinType === "hvac" ||
      asset.twinType === "passenger-flow" ||
      asset.zoneId !== undefined ||
      asset.terminalId !== undefined,
  );

  for (const asset of supportingAssets) {
    const zoneId = resolveZoneId(asset);
    const terminalId = resolveTerminalId(asset);

    const key = `${terminalId}:${zoneId}`;

    const current = zones.get(key) ?? {
      zoneId,
      zoneName: resolveZoneName(asset, zoneId),
      terminalId,
      supportingAssetCount: 0,
      configuredCapacity: null,
      estimatedOccupancy: 0,
      estimatedArrivalRatePerHour: 0,
      estimatedDepartureRatePerHour: 0,
      dataSources: new Set<string>(),
    };

    current.supportingAssetCount += 1;

    const capacity = resolveCapacity(asset);

    if (capacity !== null) {
      current.configuredCapacity = Math.max(
        current.configuredCapacity ?? 0,
        capacity,
      );
    }

    current.estimatedOccupancy = Math.max(
      current.estimatedOccupancy,
      resolveOccupancy(asset),
    );

    current.estimatedArrivalRatePerHour = Math.max(
      current.estimatedArrivalRatePerHour,
      resolveArrivalRate(asset),
    );

    current.estimatedDepartureRatePerHour = Math.max(
      current.estimatedDepartureRatePerHour,
      resolveDepartureRate(asset),
    );

    current.dataSources.add(asset.twinType);

    zones.set(key, current);
  }

  if (zones.size === 0) {
    zones.set("AIRPORT:AIRPORT-GENERAL", {
      zoneId: "AIRPORT-GENERAL",
      zoneName: "Airport General Area",
      terminalId: "AIRPORT",
      supportingAssetCount: 0,
      configuredCapacity: null,
      estimatedOccupancy: 0,
      estimatedArrivalRatePerHour: 0,
      estimatedDepartureRatePerHour: 0,
      dataSources: new Set(["model-foundation"]),
    });
  }

  return Array.from(zones.values())
    .map((zone) => {
      const occupancyPercent =
        zone.configuredCapacity !== null && zone.configuredCapacity > 0
          ? round((zone.estimatedOccupancy / zone.configuredCapacity) * 100)
          : null;

      return {
        zoneId: zone.zoneId,
        zoneName: zone.zoneName,
        terminalId: zone.terminalId,
        supportingAssetCount: zone.supportingAssetCount,
        configuredCapacity: zone.configuredCapacity,
        estimatedOccupancy: round(zone.estimatedOccupancy, 0),
        occupancyPercent,
        estimatedArrivalRatePerHour: round(zone.estimatedArrivalRatePerHour, 0),
        estimatedDepartureRatePerHour: round(
          zone.estimatedDepartureRatePerHour,
          0,
        ),
        flowLevel: determineFlowLevel(
          occupancyPercent,
          zone.estimatedArrivalRatePerHour,
          zone.estimatedDepartureRatePerHour,
        ),
        dataSource: Array.from(zone.dataSources).join(", "),
      };
    })
    .sort((left, right) => {
      const levelRank: Record<PassengerFlowLevel, number> = {
        critical: 4,
        high: 3,
        elevated: 2,
        normal: 1,
      };

      const levelDifference =
        levelRank[right.flowLevel] - levelRank[left.flowLevel];

      if (levelDifference !== 0) {
        return levelDifference;
      }

      return right.estimatedOccupancy - left.estimatedOccupancy;
    });
}

export async function createPassengerFlowTwinSnapshot(): Promise<PassengerFlowTwinSnapshot> {
  await initializeNexusAssets();

  const assets = await nexusAssetRegistry.list();

  const zones = buildZoneModels(assets);

  const capacities = zones
    .map((zone) => zone.configuredCapacity)
    .filter((value): value is number => value !== null);

  const occupancyPercentages = zones
    .map((zone) => zone.occupancyPercent)
    .filter((value): value is number => value !== null);

  return {
    generatedAt: new Date().toISOString(),
    simulationOnly: true,
    modelDerived: true,
    totalZones: zones.length,
    supportingAssetCount: zones.reduce(
      (sum, zone) => sum + zone.supportingAssetCount,
      0,
    ),
    estimatedPassengers: zones.reduce(
      (sum, zone) => sum + zone.estimatedOccupancy,
      0,
    ),
    totalConfiguredCapacity:
      capacities.length > 0
        ? capacities.reduce((sum, capacity) => sum + capacity, 0)
        : null,
    averageOccupancyPercent:
      occupancyPercentages.length > 0
        ? round(
            occupancyPercentages.reduce(
              (sum, occupancy) => sum + occupancy,
              0,
            ) / occupancyPercentages.length,
          )
        : null,
    highFlowZoneCount: zones.filter((zone) => zone.flowLevel === "high").length,
    criticalFlowZoneCount: zones.filter((zone) => zone.flowLevel === "critical")
      .length,
    estimatedArrivalRatePerHour: zones.reduce(
      (sum, zone) => sum + zone.estimatedArrivalRatePerHour,
      0,
    ),
    estimatedDepartureRatePerHour: zones.reduce(
      (sum, zone) => sum + zone.estimatedDepartureRatePerHour,
      0,
    ),
    zones,
    controls: {
      autonomousPassengerRouting: false,
      gateControlEnabled: false,
      publicAnnouncementControlEnabled: false,
      humanApprovalRequired: true,
    },
  };
}
