import type {
  CreateNexusAsset,
  NexusAssetStatus,
  NexusCriticality,
} from "@/nexus/contracts";

export const LUMI_AIRPORT_SITE_ID = "YIA";
export const LUMI_MAIN_TERMINAL_ID = "YIA-MAIN-TERMINAL";

interface HvacAssetSeed {
  id: string;
  name: string;
  assetType: string;
  parentAssetId?: string;
  zoneId?: string;
  status?: NexusAssetStatus;
  healthScore?: number;
  criticality?: NexusCriticality;
  metadata?: Record<string, unknown>;
}

function createHvacAsset(seed: HvacAssetSeed): CreateNexusAsset {
  return {
    id: seed.id,
    name: seed.name,
    twinType: "hvac",
    assetType: seed.assetType,
    siteId: LUMI_AIRPORT_SITE_ID,
    terminalId: LUMI_MAIN_TERMINAL_ID,
    zoneId: seed.zoneId,
    parentAssetId: seed.parentAssetId,
    status: seed.status ?? "stopped",
    healthScore: seed.healthScore ?? 100,
    criticality: seed.criticality ?? "high",
    metadata: {
      source: "lumi-hvac-twin",
      operationalDomain: "airport-hvac",
      ...seed.metadata,
    },
  };
}

function numberedAssets(
  prefix: string,
  count: number,
  assetType: string,
  namePrefix: string,
  metadata?: Record<string, unknown>,
): CreateNexusAsset[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");
    const id = `${prefix}-${sequence}`;

    return createHvacAsset({
      id,
      name: `${namePrefix} ${sequence}`,
      assetType,
      metadata,
    });
  });
}

function createCoolingTowerFans(): CreateNexusAsset[] {
  const fans: CreateNexusAsset[] = [];

  for (let towerIndex = 1; towerIndex <= 2; towerIndex += 1) {
    const towerSequence = String(towerIndex).padStart(2, "0");
    const towerId = `CT-${towerSequence}`;

    for (let fanIndex = 1; fanIndex <= 5; fanIndex += 1) {
      const fanSequence = String(fanIndex).padStart(2, "0");

      fans.push(
        createHvacAsset({
          id: `${towerId}-FAN-${fanSequence}`,
          name: `Cooling Tower ${towerSequence} Fan ${fanSequence}`,
          assetType: "cooling-tower-fan",
          parentAssetId: towerId,
          metadata: {
            towerId,
            fanNumber: fanIndex,
          },
        }),
      );
    }
  }

  return fans;
}

export function createHvacNexusAssets(): CreateNexusAsset[] {
  const chillers = numberedAssets("CH", 4, "chiller", "Chiller", {
    coolingPlant: "central-chilled-water-plant",
  });

  const transformers = numberedAssets(
    "TR",
    4,
    "transformer",
    "HVAC Transformer",
    { electricalRole: "chiller-group-supply" },
  );

  const primaryPumps = numberedAssets(
    "PCHWP",
    4,
    "primary-chilled-water-pump",
    "Primary Chilled Water Pump",
  );

  const secondaryPumps = numberedAssets(
    "SCHWP",
    2,
    "secondary-chilled-water-pump",
    "Secondary Chilled Water Pump",
    { rotationMode: "duty-assist-standby" },
  );

  const condenserPumps = numberedAssets(
    "CWP",
    4,
    "condenser-water-pump",
    "Condenser Water Pump",
  );

  const coolingTowers = numberedAssets(
    "CT",
    2,
    "cooling-tower",
    "Cooling Tower",
  );

  const ahus = Array.from({ length: 6 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");

    return createHvacAsset({
      id: `AHU-${sequence}`,
      name: `Air Handling Unit ${sequence}`,
      assetType: "air-handling-unit",
      zoneId: `TERMINAL-ZONE-${sequence}`,
      metadata: {
        servesZone: `TERMINAL-ZONE-${sequence}`,
      },
    });
  });

  return [
    ...chillers,
    ...transformers,
    ...primaryPumps,
    ...secondaryPumps,
    ...condenserPumps,
    ...coolingTowers,
    ...createCoolingTowerFans(),
    ...ahus,
  ];
}
