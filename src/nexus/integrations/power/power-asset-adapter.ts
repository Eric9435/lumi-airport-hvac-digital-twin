import type { CreatePowerAsset } from "@/domains/power";
import { powerTwinSeedAssets } from "@/domains/power";
import type {
  CreateNexusAsset,
  NexusAssetStatus,
  NexusCriticality,
} from "@/nexus/contracts";

const POWER_STATUS_MAP = {
  online: "online",
  offline: "offline",
  energized: "online",
  "de-energized": "stopped",
  standby: "standby",
  running: "running",
  warning: "warning",
  fault: "fault",
  maintenance: "maintenance",
} as const satisfies Record<CreatePowerAsset["status"], NexusAssetStatus>;

function determinePowerCriticality(asset: CreatePowerAsset): NexusCriticality {
  switch (asset.assetType) {
    case "utility-incomer":
    case "generator":
    case "automatic-transfer-switch":
    case "switchboard":
      return "critical";

    case "transformer":
    case "ups":
    case "feeder":
      return "high";

    case "electrical-meter":
      return "medium";
  }
}

export function adaptPowerAssetToNexus(
  asset: CreatePowerAsset,
): CreateNexusAsset {
  return {
    id: asset.id,
    name: asset.name,
    twinType: "power",
    assetType: asset.assetType,
    siteId: asset.siteId,
    parentAssetId: asset.parentAssetId,
    status: POWER_STATUS_MAP[asset.status],
    healthScore: asset.healthScore,
    criticality: determinePowerCriticality(asset),
    metadata: {
      source: "lumi-power-twin",
      operationalDomain: "airport-electrical-power",
      simulationOnly: true,

      ratedVoltageV: asset.ratedVoltageV,
      ratedCurrentA: asset.ratedCurrentA,
      ratedPowerKva: asset.ratedPowerKva,
      ratedPowerKw: asset.ratedPowerKw,

      voltageV: asset.voltageV,
      currentA: asset.currentA,
      activePowerKw: asset.activePowerKw,
      reactivePowerKvar: asset.reactivePowerKvar,
      apparentPowerKva: asset.apparentPowerKva,
      powerFactor: asset.powerFactor,
      frequencyHz: asset.frequencyHz,
      loadPercent: asset.loadPercent,

      ...asset.metadata,
    },
  };
}

export function createPowerNexusAssets(): CreateNexusAsset[] {
  return powerTwinSeedAssets.map(adaptPowerAssetToNexus);
}
