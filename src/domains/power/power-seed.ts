import type { CreatePowerAsset } from "@/domains/power/power-contracts";

const timestamp = "2026-07-15T00:00:00.000Z";

export const powerTwinSeedAssets: CreatePowerAsset[] = [
  {
    id: "POWER-UTILITY-01",
    name: "Airport Utility Incomer 01",
    assetType: "utility-incomer",
    siteId: "YIA",
    status: "energized",
    ratedVoltageV: 11000,
    ratedPowerKva: 5000,
    voltageV: 11000,
    frequencyHz: 50,
    loadPercent: 62,
    healthScore: 96,
    metadata: {
      phase: "foundation",
      simulationOnly: true,
    },
  },
  ...Array.from({ length: 4 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");

    return {
      id: `POWER-TR-${sequence}`,
      name: `Airport Transformer ${sequence}`,
      assetType: "transformer" as const,
      siteId: "YIA",
      parentAssetId: "POWER-UTILITY-01",
      status: "online" as const,
      ratedVoltageV: 400,
      ratedPowerKva: 1250,
      voltageV: 400,
      loadPercent: 45 + index * 5,
      healthScore: 95 - index,
      metadata: {
        phase: "foundation",
        linkedHvacTransformerId: `TR-${sequence}`,
        simulationOnly: true,
      },
    };
  }),
  {
    id: "POWER-GEN-01",
    name: "Emergency Generator 01",
    assetType: "generator",
    siteId: "YIA",
    status: "standby",
    ratedVoltageV: 400,
    ratedPowerKva: 1500,
    ratedPowerKw: 1200,
    voltageV: 0,
    frequencyHz: 50,
    loadPercent: 0,
    healthScore: 94,
    metadata: {
      phase: "foundation",
      simulationOnly: true,
    },
  },
  {
    id: "POWER-ATS-01",
    name: "Automatic Transfer Switch 01",
    assetType: "automatic-transfer-switch",
    siteId: "YIA",
    parentAssetId: "POWER-UTILITY-01",
    status: "online",
    ratedVoltageV: 400,
    healthScore: 98,
    metadata: {
      normalSourceId: "POWER-UTILITY-01",
      emergencySourceId: "POWER-GEN-01",
      activeSourceId: "POWER-UTILITY-01",
      simulationOnly: true,
    },
  },
];

void timestamp;
